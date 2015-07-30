console.log('javascript started')

var width = document.body.clientWidth
var height = document.body.scrollHeight

console.log('viewport dimensions: ' + width + ', ' + height)

// create svg for working out dimensions necessary for rendering labels' text
var hiddenSVG = d3.select('body').append('svg:svg').attr('width', 0).attr('height', 0)
var SVGText   = hiddenSVG.append('svg:text')
                         .attr('y', -500)
                         .attr('x', -500)
                         .style('font-size', '14px')

var presentationSVGWidth = width
var presentationSVGHeight = height - 100
var presentationSVG = d3.select('body').append('svg:svg')
                                         .attr('width', presentationSVGWidth)
                                         .attr('height', presentationSVGHeight)

var globalGraph = new dagre.graphlib.Graph({ multigraph: true});

function calcBBox(text) {
  SVGText.text(text);
  return SVGText.node().getBBox();
}

function getNodes(callback){
  console.log('loading nodes')
  d3.csv('cae-data/nodes', function(err, inputNodes) {
    if (err) console.error(err)
    else {
      console.log('input nodes: '); console.dir (inputNodes)
      inputNodes.forEach(function(node) {
        bbox = calcBBox(node.name)
        globalGraph.setNode(node.id, { name: node.name, kind: node.kind, width:bbox.width, height:bbox.height })
      })
      console.log('nodes: '); console.dir(globalGraph.nodes())
      
      console.log('loading sources, this may take a while...'); 
      
      console.log('skipping preemptive source loading')
      callback()
      //getSources(callback)
    }
  })
}

function postProcessInput(edge){
  // make an 'owned by' edge equivalent to a 'declares member' edge
  // the nature of the real-world difference will be sorted out by using this
  // code, but as it currently stands they are considered just the same here.
  // in the end, this will be handled in the Scala code itself
  if (edge.edgeKind == 'owned by') {
    t = edge.id1; edge.id1 = edge.id2; edge.id2 = t; // swap edge's direction
    edge.edgeKind = 'declares member'
  }
}

function getEdges(callback){
  console.log('loading edges')
  d3.csv('cae-data/edges', function(err, inputEdges) {
    if (err) console.error(err)
    else {
      console.log('input edges: '); console.dir(inputEdges)
      inputEdges.forEach(function(edge) {
        // TODO: get bounding box size required for rendering the label 
        postProcessInput(edge)
        globalGraph.setEdge(edge.id1, edge.id2, { edgeKind: edge.edgeKind });
      })
      console.log('edges: '); console.dir(globalGraph.edges())

      inputEdges.forEach(function(edge) {
        if (globalGraph.edge({v:edge.id1, w:edge.id2}) === undefined)
          console.warn('input edge ' + edge  + ' failed to initialize as a graphlib edge')
      })

      callback()
    }
  })
}

sourceMap = {}
// recursively fetch source for all nodes, synchronously
function getSources(callback, i) {
  i = i+1 || 0; if (i == globalGraph.nodes().length) callback()
  else {
    id = globalGraph.nodes()[i]
    d3.text('cae-data/' + 'node-source-' + id, function(err, nodeSource) {
      if (err) console.error(err)
      else {
        sourceMap[id] = nodeSource
        getSources(callback, i) // next
      }
    })
  }
}

function verifyDataLoad(callback) {
  if (Object.keys(sourceMap).length != globalGraph.nodes().length)
    console.warn('number of sources does not equal the number of nodes')

  console.log('data loading done')
  applyGraphFilter()
  console.log('data filters applied')
  initAwesomplete()
  fireGraphDisplay(8464)
}

// recursive removal of nodes owned by a given node, 
// along with the ownership edges connecting them
function removeOwned(nodeId, graph) {
  for (edge of graph.nodeEdges(nodeId)) {
    if (edge.w != nodeId) // avoid infinitely going back to parent every time
      if (graph.edge(edge).edgeKind == 'declares member') {
        var owned = edge.w
        console.log('removing ' + owned)
        removeOwned(owned, graph)
        graph.removeNode(owned)
        graph.removeEdge(edge)
      }
  }
}

packageExcludeList = [
  { 
    description: 'scala core',
    chain: ['scala'] 
  },
  { 
    description: 'java core',
    chain: ['java', 'lang'] 
  }
]

function filterByChain(chain, graph) {

  function trim(nodeId) {
    console.log('trimming ownership chain starting at: ' + chain.join('.') + ' (' + nodeId + ')')
    removeOwned(nodeId, graph)
  }
  
  function findUniqueByName(nodeName) {
    var nodeIds = getNodesByName(nodeName, graph)
    if (nodeIds.length != 1) {
      console.warn ('could not uniquely identify requested node, ' + nodeName + ' : ' + nodeName.length + ' root nodes found, whereas only one is expected!')
      return undefined
    }

    return nodeIds[0]
  }

  var nodeId = findUniqueByName('<root>')
  if (nodeId === undefined) return false
 
  var match = true
  for (var chainPos = 0; chainPos < chain.length && match == true; chainPos++) {
    chainNodeName = chain[chainPos]
    match = false
    for (edge of graph.nodeEdges(nodeId)) {
      if (graph.edge(edge).edgeKind == 'declares member') {
        nodeId = edge.w
        if (graph.node(nodeId).name == chainNodeName) {
          match = true
          break
        }
      }
    }
  }

  if (match == true)
    trim(nodeId)
}

function applyGraphFilter() {
  for (exclusion of packageExcludeList) {

    filterByChain(exclusion.chain, globalGraph)
  }
}

function fetchData(callback) {
  // callback-hell-style flow control for all data loading
  getNodes(function(){getEdges(verifyDataLoad)})
}

fetchData() 

function getNodesByName(searchNodeName, graph) {
  var found = graph.nodes().filter(function(id) {
    return graph.node(id).name == searchNodeName
  })
  return found
}

function getOnwershipChain(id) {

  var chain = []
  function getNodeOwnershipChain(id) {
    // look for ownership edges    
    globalGraph.nodeEdges(id).forEach(function(edge) { 
      if (globalGraph.edge(edge).edgeKind == 'declares member') {
        if (edge.w == id) {
          var owner = edge.v
          chain.push(owner)
          getNodeOwnershipChain(owner)
        }
      }
    })
  }

  getNodeOwnershipChain(id)
}

function getNodeEnvGraph(id, degree) {

  // this is a naive implementation meant for very small values of degree.
  // for any humbly large degree, this needs to be implemented for efficient Big O(V,E),
  // as the current one is very naive in that sense.

  console.log(id)

  displayGraph = new dagre.graphlib.Graph({ multigraph: true}); 
  
  displayGraph.setNode(id, globalGraph.node(id)) // copy provided node from global graph

  function addNodeNeighbors(id, degree) {
    if (degree == 0) return   
    globalGraph.nodeEdges(id).forEach(function(edge) {

      //testNodeOnwershipChain(edge.v)
      //testNodeOnwershipChain(edge.w)

      displayGraph.setNode(edge.v, globalGraph.node(edge.v)) 
      displayGraph.setNode(edge.w, globalGraph.node(edge.w)) 
      displayGraph.setEdge(edge.v, edge.w, globalGraph.edge(edge.v, edge.w))

      if (edge.v != id) addNodeNeighbors(edge.v, degree - 1)
      if (edge.w != id) addNodeNeighbors(edge.w, degree - 1)
    })
  }

  addNodeNeighbors(id, degree)
  console.log(displayGraph)
  return displayGraph
}

function fireGraphDisplay(nodeId) {
  //var displayGraph = getNodeEnvGraph(nodeId,1)
  var displayGraph = getNodeEnvGraph(nodeId,2)
  displayGraph.setGraph({})
  dagre.layout(displayGraph)

  console.log(displayGraph)
  console.log('layout dimensions: ' + displayGraph.graph().width + ', ' + displayGraph.graph().height)
  console.log('nodes: ' + displayGraph.nodes().length + ', ' + 'edges: ' + displayGraph.edges().length)
  console.log('layout computed')
  d3Render(displayGraph)
}

function initAwesomplete() {
  'use strict'
  //getFirstResultEnv("signature")
  
  let nodes = globalGraph.nodes().map(function(id) {
    let node = { id: id, 
                 data: globalGraph.node(id) }
    //return node.name + ' ' + '(' + id + ')'
    return node
  })

  var inputBar = document.getElementById('inputBar')
  new Awesomplete(inputBar, {
    minChars: 1,
    maxItems: 100,
    list: nodes,
    item: function (node, input) { 
            let suggestedElem = document.createElement('li')
            suggestedElem.appendChild(document.createTextNode(node.data.kind + ' ' + node.data.name + ' ' + '(' + node.id + ')'))
            return suggestedElem
          },
    filter: function (node, input) {
              return node.data.name.toLowerCase().indexOf(input.toLowerCase()) > -1 ||
                     node.id === input 
            },
    sort: function compare(a, b) {
            if (a.data.name < b.data.name) return -1
            if (a.data.name > b.data.name) return 1
            return 0
          },
    replace: function(text) {
      var id = text.substring(text.indexOf('(') + 1, text.indexOf(')'))
      var node = globalGraph.node(id)

      console.log('user selected ' + text)
      fireGraphDisplay(id)

      this.input.value = text
    }
  })

  window.addEventListener("awesomplete-selectcomplete", function(e) {
    // User made a selection from dropdown. 
    // This is fired after the selection is applied
  }, false)

  //getFirstResultEnv('signature')
  //fireGraphDisplay(35478)

}

// temporary testing function
function getFirstResultEnv(searchNodeName) {
  firstResult = getNodesByName(searchNodeName)[0]
  if (firstResult === undefined) return false
  console.log(firstResult)
  getNodeEnvGraph(firstResult, 1)
}

function d3Render(displayGraph) {

  function graphlibTod3(displayGraph) {
    //
    // transform the input graph to a d3 input graph as per the format:
    //   https://github.com/mbostock/d3/wiki/Force-Layout#nodes 
    //   https://github.com/mbostock/d3/wiki/Force-Layout#links
    //
    nodeIdIndex = {}
    var nodesJson = displayGraph.nodes().map(function(id, index) {
        nodeIdIndex[id] = index

        // set the initial location via px, py
        d3Node = displayGraph.node(id)
        //console.log(d3Node)
        d3Node['px'] = displayGraph.node(id).x
        d3Node['py'] = displayGraph.node(id).y
        return d3Node
      })
    //console.log(nodeIdIndex)  
    //console.log(nodesJson)  

    var linksJson = displayGraph.edges().map(function(edge) {
      return { source: nodeIdIndex[edge.v], 
               target: nodeIdIndex[edge.w] }
    })

    //console.log(displayGraph.edges())
    //console.log(linksJson)
    return { nodesJson, linksJson }
  }

  var data = graphlibTod3(displayGraph)

  // d3 force simulation layout
  var forceLayout = d3.layout.force()
                               .linkDistance(20)
                               .charge(-50)
                               .gravity(0.1)
                               .size([presentationSVGWidth, presentationSVGHeight])
                               //.on("tick", tickHandler);

  var links = 
    presentationSVG.selectAll(".link")
      .data(data.linksJson)
      .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var nodes = 
    presentationSVG.selectAll(".node")
      .data(data.nodesJson)
      .enter().append("circle")
      .attr("class", "node")
      .attr("r", 10)
      .style("fill", function(node) { 
        if (node.kind == 'trait')           return d3.rgb('blue').darker(2)
        if (node.kind == 'class')           return d3.rgb('blue').brighter(1)
        if (node.kind == 'object')          return d3.rgb('blue').brighter(1.6)
        if (node.kind == 'anonymous class') return d3.rgb('gray')
        if (node.kind == 'method')          
          if (node.name.indexOf('$') > 0)   return d3.rgb('gray').brighter(0.3)
          else                              return d3.rgb('green')
        if (node.kind == 'value')           return d3.rgb('green').brighter(1.3)
        if (node.kind == 'package')         return d3.rgb('blue').darker(3)

        
      })
      .call(forceLayout.drag);

  nodes.append("title")
      .text(function(d) { return d.kind + ' ' + d.name; });

  forceLayout.nodes(data.nodesJson)
             .links(data.linksJson)
             .start()

  forceLayout.on("tick", function() {

    var outOfBound = false

    function isWithinBounds() {

    }

    nodes.each(function(d){
      radius = parseInt(d3.select(this).attr('r'))
      if (d.x < radius) d.x = radius
      if (d.y < radius) d.y = radius
      if (d.x > presentationSVGWidth - radius) d.x = presentationSVGWidth - radius
      if (d.y > presentationSVGHeight - radius) d.y = presentationSVGHeight - radius
    })

    //
    // when the force simulation is running, synchronizes the location
    // of the d3 managed svg elements to the current simulation values
    //
    links.attr("x1", function(d) { return d.source.x; })
         .attr("y1", function(d) { return d.source.y; })
         .attr("x2", function(d) { return d.target.x; })
         .attr("y2", function(d) { return d.target.y; })

    nodes.attr("cx", function(d) { return d.x; })
         .attr("cy", function(d) { return d.y; })

    //nodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
  })

  forceLayout.on("end", function() {
    console.log('layout stable')
  })
}

//getFirstResultEnv('signature')



//dagre.layout(g);

//console.log('layout computed')



/*
g.nodes().forEach(function(v) {
     console.log('Node ' + v + ': ' + JSON.stringify(g.node(v)));
});
g.edges().forEach(function(e) {
    console.log('Edge ' + e.v + ' -> ' + e.w + ': ' + JSON.stringify(g.edge(e)));
});
*/

/////////////////////////////////////////////////////////////////////////////////////////////////

// validate the input data
if (globalGraph.nodes().filter(
  function(node) {
  return g.node(node) === undefined
}).length > 0)
  console.error('internal error: nodes without values should not exist')

// searches for nodes that match a given name
function findByName(name) {
  return g.nodes().filter(
    function(nodeId) {
    return g.node(nodeId).name == name
  })
}

// lists all nodes connected to given node through edges of given type
function nodeEdgesByEdgeKind(nodeID, edgeKind) {
  return g.nodeEdges(nodeID)
    .filter(
      function(edgeID) {
        return g.edge(edgeID).edgeKind == edgeKind
      })
    .map(
      function(edge) {
        return { 'id': edge.w, node: g.node(edge.w) }
      })
}

function parentChain(nodeID) {}

//////////////////////////////////////////////////////////////////////////////////////////////////

// can use non SVG maybe https://developer.mozilla.org/en/docs/Web/API/Element/getBoundingClientRect
// but with SVG it is simple to draw invisibly outside the page

globalGraph.edges().forEach(function(edge){
  if (globalGraph.edge(edge.v, edge.w).edgeKind == 'owned by') console.log('bad')
})



ownershipChainMap = {}
function getNodeOnwershipChain(id) {
  'use strict'
  let node = globalGraph.node(id)
  globalGraph.nodeEdges(id).forEach(function(edge) {
    if (edge.w == id && globalGraph.edge(edge).edgeKind == 'declares member') {
      let owner = edge.v
      console.log('owner: '); console.log(globalGraph.node(owner))
      getNodeOnwershipChain(owner)
    }
  })
}
