console.log('javascript started')

var width
var height
var presentationSVGWidth 
var presentationSVGHeight

var nodeZoom = false

function windowResizeHandler() {
  width = document.body.clientWidth
  height = document.body.scrollHeight

  presentationSVGWidth = width
  presentationSVGHeight = height - 100

  presentationSVG.attr('width', presentationSVGWidth)
                 .attr('height', presentationSVGHeight)

}

var interactionState = { "inDrag": false }

console.log('viewport dimensions: ' + width + ', ' + height)

// create svg for working out dimensions necessary for rendering labels' text
var hiddenSVG = d3.select('body').append('svg:svg').attr('width', 0).attr('height', 0)
var SVGText   = hiddenSVG.append('svg:text')
                         .attr('y', -500)
                         .attr('x', -500)
                         .style('font-size', '14px')

var presentationSVG = d3.select('body').append('svg:svg')
  
windowResizeHandler()

function experimentalFishEyeIntegration() {
  // Note: this feels a little jerky, maybe tweening is required
  // Note: does not play well with the force layout ticks, but 
  //       should be easy to reconcile the two by merging 
  //       this logic into the main rendering function, to 
  //       rely on the fisheye values directly there.
  presentationSVG.on("mousemove", function() { 
    fisheye.focus(d3.mouse(this)) 

    d3DisplayNodes.each(function(d) { d.fisheye = fisheye(d); })
        .attr("cx", function(d) { return d.fisheye.x; })
        .attr("cy", function(d) { return d.fisheye.y; })
        .attr("r", function(d) { return d.fisheye.z * 4.5; });

    d3DisplayLinks.attr("points", function(d) {
        var source = d.source.fisheye.x + "," + d.source.fisheye.y + " "
        var mid    = (d.source.fisheye.x + d.target.fisheye.x)/2 + "," + (d.source.fisheye.y + d.target.fisheye.y)/2 + " "
        var target = d.target.fisheye.x + "," + d.target.fisheye.y
        return  source + mid + target
      })
  })
}

var fisheye = d3.fisheye.circular()
    .radius(100)
    .distortion(5);

// arrow-head svg definition
function setUsesShape(length, ratio) {

  var shortEdgeLength = length * ratio

  var path = 'M0,0' + 
             'L0,' + shortEdgeLength +
             'L' + length + ',' + (shortEdgeLength/2) +
             'L0,0'


  presentationSVG.append("svg:defs").selectAll("marker")
      .data(["arrow"])      
    .enter().append("svg:marker")
      .attr("id", "arrow")
      .attr("refX", 0) 
      .attr("refY", shortEdgeLength/2)
      .attr("markerWidth", length)
      .attr("markerHeight", shortEdgeLength)
      .attr("markerUnits", "userSpaceOnUse") 
      //.attr("markerUnits", "strokeWidth")
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", path)
      .style("fill", d3.rgb('green'))      
}; setUsesShape(10, 0.5)


/*
function setExtedsShape(length, ratio) {

  var shortEdgeLength = length * ratio

  var path = 'M0,0' + 
             'L0,' + shortEdgeLength +
             'L' + length + ',' + (shortEdgeLength/2) +
             'L0,0'

  presentationSVG.append("svg:defs").selectAll("marker")
      .data(["nonDash"])      
    .enter().append("svg:marker")
      .attr("id", "nonDash")
      .attr("refX", length) 
      .attr("refY", shortEdgeLength/2)
      .attr("markerWidth", length)
      .attr("markerHeight", shortEdgeLength)
      .attr("markerUnits", "userSpaceOnUse") 
      //.attr("markerUnits", "strokeWidth")
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", path)
      .style("fill", d3.rgb('green'))      
}; setExtedsShape(10, 0.5)
*/

// arrow-head svg definition



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
      
      //console.log('skipping preemptive source loading')
      callback()
      getSources(function(){})
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
  i = i+1 || 0; 

  if (i == globalGraph.nodes().length) 
  {
    console.log('done fetching sources')
    callback()
  }
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
  applyRenames()

  console.log('data filters applied')
  
  displayGraph = new dagre.graphlib.Graph({ multigraph: true}); 

  d3ForceLayoutInit()

  window.onresize = function() {
    windowResizeHandler()
    d3Render(displayGraph)
  }

  initAwesomplete()
  //fireGraphDisplay(87570)
  //fireGraphDisplay(35478)
  fireGraphDisplay(8464)
  //fireGraphDisplay(8250)
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

//
// filter out non-informative nodes from the global graph
//
function applyGraphFilter() {
  nodesBefore = globalGraph.nodes().length
  edgesBefore = globalGraph.edges().length
  
  for (exclusion of packageExcludeList) {
    filterByChain(exclusion.chain, globalGraph)
  }

  nodesAfter = globalGraph.nodes().length
  edgesAfter = globalGraph.edges().length

  console.log('filtered out nodes belonging to packages ' +  packageExcludeList.map(function(l){ return l.chain.join('.')}).join(', ') + 
              ', accounting for ' + parseInt((1-(nodesAfter/nodesBefore))*100) + '% of nodes and ' + 
               parseInt((1-(edgesAfter/edgesBefore))*100) + '% of links.')
}

//
// rename nodes in the global graph
//
function applyRenames() {
  globalGraph.nodes().forEach(function(nodeId){
    if (globalGraph.node(nodeId).name.indexOf('$') > 0) console.log(globalGraph.node(nodeId).name)
  })
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

function addNodeToDisplay(id) {
  var node = globalGraph.node(id)
  node.status = {} // for adding behavior that requirest node status
  displayGraph.setNode(id, node)  
}

// add node neighbors to display graph
function addNodeNeighbors(graph, id, degree) {
  //console.log(id)
  if (degree == 0) return   
  globalGraph.nodeEdges(id).forEach(function(edge) {
    //console.log(edge)
    //testNodeOnwershipChain(edge.v)
    //testNodeOnwershipChain(edge.w)

    //if (!displayGraph.hasNode(edge.v))
    addNodeToDisplay(edge.v)
    //if (!displayGraph.hasNode(edge.w))     
    addNodeToDisplay(edge.w)

    graph.setEdge(edge.v, edge.w, globalGraph.edge(edge.v, edge.w))

    if (edge.v != id) addNodeNeighbors(graph, edge.v, degree - 1)
    if (edge.w != id) addNodeNeighbors(graph, edge.w, degree - 1)
  })
}

function getNodeEnvGraph(id, degree) {

  // this is a naive implementation meant for very small values of degree.
  // for any humbly large degree, this needs to be re-implemented for efficient Big O(V,E),
  // as the current one is very naive in that sense.

  console.log(id)

  //var graph = new dagre.graphlib.Graph({ multigraph: true}); 
  
  addNodeToDisplay(id)
  
  addNodeNeighbors(displayGraph, id, degree)
  //console.log(displayGraph)
  return displayGraph
}

function makeHierarchyChain(nodeId) {
  var hierarchyNode = { name: displayGraph.node(nodeId).name }
  var children = []
  displayGraph.edges(nodeId).forEach(function(edge) {
    if (displayGraph.edge(edge).edgeKind == 'declares member' && edge.v == nodeId) {
      //console.log(edge)
      children.push(makeHierarchyChain(edge.w))
    }
  }) 
  if (children.length > 0) hierarchyNode['children'] = children
  return hierarchyNode
}

// compute a circle pack layout for a given hierarchy
function computeCirclePack(hierarchy) {

  var pack = d3.layout.pack()
    .size([100, 100])
    .padding(2)
    .value(function(d) { return 20 })

  pack(hierarchy)
  var nodes = pack.nodes(hierarchy)
  var links = pack.links(nodes)
}

// compute circle graph
function fireGraphDisplay(nodeId) {
  displayGraph = getNodeEnvGraph(nodeId,2)
  displayGraph.setGraph({})
  //dagre.layout(displayGraph) // this creates a dagre initial layout that is unfortunately 
                               // not bound to the window's viewport but may
                               // be much much larger.

  console.log(displayGraph)
  console.log('dagre layout dimensions: ' + displayGraph.graph().width + ', ' + displayGraph.graph().height)
  console.log('nodes: ' + displayGraph.nodes().length + ', ' + 'edges: ' + displayGraph.edges().length)
  console.log('layout computed')

  computeCirclePack(makeHierarchyChain(nodeId)) // we don't do anything with it right now

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
}

function SetOrUpdateD3Data(displayGraph) {
  //
  // transform the input graph to a d3 input graph as per the format:
  //   https://github.com/mbostock/d3/wiki/Force-Layout#nodes 
  //   https://github.com/mbostock/d3/wiki/Force-Layout#links
  //
  nodeIdIndex = {}
  var nodesJson = displayGraph.nodes().map(function(id, index) {
      nodeIdIndex[id] = index

      d3Node = displayGraph.node(id)
      d3Node['id'] = id // add back the id
      //console.log(d3Node[id.toString()])
      // set the initial location via px, py
      d3Node['px'] = displayGraph.node(id).x
      d3Node['py'] = displayGraph.node(id).y
      return d3Node
    })

  var linksJson = displayGraph.edges().map(function(edge) {
    return { source: nodeIdIndex[edge.v], // d3 required index of node
             target: nodeIdIndex[edge.w], // d3 required index of node
             v: edge.v,                   // original node number
             w: edge.w,                   // original node number
             edgeKind: displayGraph.edge(edge).edgeKind }
  })

  //console.log(displayGraph.edges())
  //console.log(linksJson)
  return { nodesJson, linksJson }
}

var d3DataBind = { nodesJson:[], linksJson:[] }

function d3ForceLayoutInit() {

  // svg hooks for the content (separate hooks allow controlling for render "z-order")
  presentationSVG.append("g").attr("class", "links") 
  presentationSVG.append("g").attr("class", "extensionArcs") 
  presentationSVG.append("g").attr("class", "nodes") 

  forceLayout = d3.layout.force()
                         .gravity(0.5)
                         .linkDistance(20)
                         .charge(-150)
                         .size([presentationSVGWidth, presentationSVGHeight])
                         .on("tick", tick)
}

function tick(additionalConstraintFunc) {

  function keepWithinDisplayBounds() {
    d3DisplayNodes.each(function(d){
      radius = parseInt(d3.select(this).attr('r'))
      if (d.x < radius) d.x = radius
      if (d.y < radius) d.y = radius
      if (d.x > presentationSVGWidth - radius) d.x = presentationSVGWidth - radius
      if (d.y > presentationSVGHeight - radius) d.y = presentationSVGHeight - radius
    })
  }

  function syncView() {
    //
    // when the force simulation is running, synchronizes the location
    // of the d3 managed svg elements to the current simulation values
    //

    //console.log(d3DisplayNodes) 

    var count = 0

    // d3DisplayLinks.attr("x1", function(d) { return d.source.x; })
    //              .attr("y1", function(d) { return d.source.y; })
    //              .attr("x2", function(d) { return d.target.x; })
    //              .attr("y2", function(d) { return d.target.y; })

    d3DisplayLinks.attr("points", function(d) {
      var source = d.source.x + "," + d.source.y + " "
      var mid    = (d.source.x + d.target.x)/2 + "," + (d.source.y + d.target.y)/2 + " "
      var target = d.target.x + "," + d.target.y
      return source + mid + target
    })


    d3DisplayNodes.attr("cx", function(d) { count++; return d.x; })
                  .attr("cy", function(d) { return d.y; })

    d3ExtensionArcs.attr("d", function(edge) {
      //return "d","M 0 60 L 50 110 L 90 70 L 140 100"
      //return ('M ' + parseInt(edge.source.x -40) + ' ' + parseInt(edge.source.y) + ' ' +
      //        'L ' + parseInt(edge.source.x + 40) + ' ' + parseInt(edge.source.y))

      return ('M' + (edge.source.x - 10) + ',' + (edge.source.y) + 
              ' A1,1 0 0 1 ' +
              + (edge.source.x + 10) + ',' + (edge.source.y))
    })
    .attr('transform', function(edge) {

      // get the direction of the edge as an angle
      var edgeAngleDeg = Math.atan((edge.source.y - edge.target.y) / (edge.source.x - edge.target.x)) * 180 / Math.PI
      if (edge.source.x < edge.target.x) edgeAngleDeg += 180

      // rotate arc according to this angle
      return 'rotate(' + (edgeAngleDeg - 90) + ' ' + edge.source.x + ' ' + edge.source.y + ')'
    })

    //console.log(count)
    //nodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
  }

  keepWithinDisplayBounds()
  if (typeof additionalConstraintFunc === 'function') additionalConstraintFunc()
  syncView()
  // forceLayout.stop() // show dagre layout without really letting the force layout
}

function d3Render(displayGraph) {

  d3DataBind = SetOrUpdateD3Data(displayGraph)
  //console.log('d3 data nodes ' + d3DataBind.nodesJson.length)

  d3DisplayLinks = 
    presentationSVG.select(".links").selectAll(".link")
      .data(d3DataBind.linksJson, function(edge) { return edge.v + edge.w })

  d3DisplayLinks
      .enter().append("polyline")
      .attr("class", "link")
      .attr("id", function(edge) { // for allowing indexed access
        return 'link' + edge.v + 'to' + edge.w
      })
      .style("stroke-width", 1)
      .style("stroke", function(edge) { 
        if (edge.edgeKind == 'declares member') return d3.rgb('white').darker(2)
        if (edge.edgeKind == 'extends')         return d3.rgb('blue')
        if (edge.edgeKind == 'uses')            return d3.rgb('green')
      })
      .attr("marker-mid", function(edge) {
        if (edge.edgeKind == 'uses')            return "url(#arrow)"
      })
      //.attr("marker-mid", function(edge) {
      //  if (edge.edgeKind == 'extends')         return "url(#nonDash)"
      //})
      .attr("stroke-dasharray", function(edge) {
        if (edge.edgeKind == 'declares member') return "none"
        if (edge.edgeKind == 'extends')         return "4,3"
        if (edge.edgeKind == 'uses')            return "none"
      })


  var extendEdges = d3DataBind.linksJson.filter(function(edge) { 
    if (edge.edgeKind == 'extends') return true
    return false
  })
      
  d3ExtensionArcs = presentationSVG.select(".extensionArcs").selectAll(".extensionArc")
    .data(extendEdges, function(edge) { return edge.v + edge.w })

  d3ExtensionArcs
    .enter().append("path")
    .attr("class", "extensionArc")
    .attr("id", function(edge) { // for allowing indexed access
      //console.log('an arc')
      return 'arc' + edge.v + 'to' + edge.w
    })


  d3DisplayNodes = 
    presentationSVG.select(".nodes").selectAll(".node")
      .data(d3DataBind.nodesJson, function(node) { return node.id })

  d3DisplayNodes
    .enter().append("circle")
    .attr("class", "node")
    .attr("id", function(node) { // for allowing indexed access
      return 'node' + node.id
    })
    .attr("r", function(node) { return Math.log(globalGraph.nodeEdges(node.id).length * 250) })
    .style("fill", function(node) { 
      if (node.kind == 'trait')           return d3.rgb('blue').darker(2)
      if (node.kind == 'class')           return d3.rgb('blue').brighter(1)
      if (node.kind == 'object')          return d3.rgb('blue').brighter(1.6)
      if (node.kind == 'anonymous class') return d3.rgb('gray').brighter(0.9)
      if (node.kind == 'method')          
        if (node.name.indexOf('$') > 0)   return d3.rgb('gray').brighter(0.9)
        else                              return d3.rgb('green')
      if (node.kind == 'value')           return d3.rgb('green').brighter(1.3)
      if (node.kind == 'package')         return d3.rgb('white').darker(2)
    })
    .call(forceLayout.drag)

    .on('dblclick', function(node) {
      console.log('in double click')
      //console.log(node.id)
      //node.fixed = true

      //console.log("node")
      //console.log(node) 

      //console.log(displayGraph.nodes().length)
      addNodeNeighbors(displayGraph, node.id, 1)
      //console.log(displayGraph.nodes().length)
      d3Render(displayGraph)
    })

    .on('mouseover', function(node) {
      for (edge of displayGraph.nodeEdges(node.id)) {
        // highlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 3)
        // highlight its nodes
        var selector = '#node' + edge.v
        presentationSVG.select(selector).transition().style('stroke', 'orange')
        var selector = '#node' + edge.w
        presentationSVG.select(selector).transition().style('stroke', 'orange')
      }
    })

    .on('mouseout', function(node) {
      for (edge of displayGraph.nodeEdges(node.id)) {
        // highlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 1).delay(300)
        // highlight its nodes
        var selector = '#node' + edge.v
        presentationSVG.select(selector).transition().style('stroke', '#fff').duration(1000)
        var selector = '#node' + edge.w
        presentationSVG.select(selector).transition().style('stroke', '#fff').duration(1000)
      }
    })

  forceLayout.drag().on('dragstart', function (d) { 
    dragStart = {x: d.x, y: d.y}
  })


  function onClick(node) {
    var supershape = d3.superformula()
                       .type("rectangle")
                       .size(1000)
                       .segments(3600);

    var selector = '#node' + node.id

    var radius = Math.min(presentationSVGWidth, presentationSVGHeight) / 2

    presentationSVG.select(selector).transition().duration(2000).attr("r", radius)

    nodeZoom = true

    d3Render(displayGraph)

    console.log(node)                   
    console.log(supershape)

    //console.log('Source Code:')
    //console.log('------------')
    //console.log(sourceMap[node.id])
  }

  forceLayout.drag().on('dragend', function (d) { 

    // determine drag-end v.s. click, by mouse movement
    // (this is needed with d3, see e.g. // see http://stackoverflow.com/questions/19931307/d3-differentiate-between-click-and-drag-for-an-element-which-has-a-drag-behavior)
    if (dragStart.x == d.x && dragStart.y == d.y) 
      onClick(d)
    else
      d.fixed = true

  })

  d3DisplayNodes.append("title") // this is the default html tooltip definition
      .attr("class", "tooltip")
      .text(function(d) { return d.kind + ' ' + d.name; });

  //console.log(d3DataBind.nodesJson.length)
  //console.log(d3DataBind.nodesJson.length)
  //console.log(d3DataBind.linksJson.length)
  forceLayout.nodes(d3DataBind.nodesJson)
             .links(d3DataBind.linksJson)
             .start()

  forceLayout.on("end", function() {
    console.log('layout stable')
    nodeZoom = false
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
