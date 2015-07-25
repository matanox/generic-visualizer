console.log('javascript started')

// create svg for working out dimensions necessary for rendering labels' text
var hiddenSvg = d3.select('body').append('svg:svg')
var svgText   = hiddenSvg.append('svg:text')
                         .attr('y', -500)
                         .attr('x', -500)
                         .style('font-size', '14px')


var globalGraph = new dagre.graphlib.Graph({ multigraph: true});

function calcBBox(text) {
  svgText.text(text);
  return svgText.node().getBBox();
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
      
      console.log('loading sources, this may take a while...'); getSources(callback)
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
  else 
  {
    console.log('data loading done')
    test()
  }
}

function fetchData(callback) {
  // callback-hell-style flow control for all data loading
  getNodes(function(){getEdges(verifyDataLoad)})
}

fetchData()

function getNodesByName(searchNodeName) {
  found = globalGraph.nodes().filter(function(id) {
    return globalGraph.node(id).name == searchNodeName
  })
  found.forEach(function(id) {
    console.log(globalGraph.node(id))
  })
  return found
}

function getNodeEnvGraph(id) {

  var displayGraph = new dagre.graphlib.Graph({ multigraph: true}); 
  
  displayGraph.setNode(id, globalGraph.node(id)) // copy central node from global graph

  nodeEdges = globalGraph.nodeEdges(id); console.log(nodeEdges)

  nodeEdges.forEach(function(edge) {
    displayGraph.setNode(edge.v, globalGraph.node(edge.v)) 
    displayGraph.setNode(edge.w, globalGraph.node(edge.w)) 
    displayGraph.setEdge(edge.v, edge.w, globalGraph.edge(edge.v, edge.w))
  })

  console.log(displayGraph)
}


function test() {
  'use strict'
  getFirstResultEnv("signature")
  let nodeNames = globalGraph.nodes().map(function(id) {
    let node = globalGraph.node(id)
    return node.name + ' ' + '(' + id + ')'
  })
  var inputBar = document.getElementById('inputBar')
  new Awesomplete(inputBar, {
    minChars: 1,
    maxItems: 100,
    list: nodeNames,
    item: function item(suggestedText, input) { 
            let suggested = document.createElement('li')
            suggested.appendChild(document.createTextNode(suggestedText))
            return suggested
          }
  })
}

// easy testing function - temporary
function getFirstResultEnv(searchNodeName) {
  firstResult = getNodesByName(searchNodeName)[0]
  if (firstResult === undefined) return false

  getNodeEnvGraph(firstResult)
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