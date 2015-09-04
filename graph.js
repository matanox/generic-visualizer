console.log('javascript started')

var width
var height
var presentationSVGWidth 
var presentationSVGHeight

function windowResizeHandler() {
  width = window.innerWidth
  height = window.innerHeight

  //
  // Chrome may add an extra pixel beyond the screen dimension on either axis, upon zoom, 
  // which may directly require either one of the axis scroll bars, that in turn will
  // by definition reduce the viewport, thus forcing the complementary scroll bar 
  // becoming necessary as well, thus cascading into both scroll bars being 
  // necessarily visible, wasting a lot of viewport space and attention for just one pixel.
  //
  // We bypass all that by using one pixel less than what the viewport size initially is -
  // in both axis dimensions.b
  //

  presentationSVGWidth = width -1   
  presentationSVGHeight = height -1 
 
  presentationSVG.attr('width', presentationSVGWidth)
                 .attr('height', presentationSVGHeight)

}

var sphereFontSize = 12 // implying pixel size

var interactionState = {
                         longStablePressEnd: false,
                         ctrlDown: false,
                         searchDialogEnabled: false
                       }

var awesompleteContainerDiv = document.getElementById("awesompleteContainer")

function searchDialogDisable() {
  document.getElementById('inputBar').value = ''
  interactionState.searchDialogEnabled = false
  awesompleteContainerDiv.style.visibility = 'hidden'
}      

function searchDialogEnable() {
  interactionState.searchDialogEnabled = true
  awesompleteContainerDiv.style.visibility = 'visible'
}

function isAlphaNumeric(keyCode) {
  return ((keyCode >= 65 && keyCode <= 90)  ||
          (keyCode >= 97 && keyCode <= 122) ||
          (keyCode >= 48 && keyCode <= 57))
}

document.onkeypress = function(evt) {
  console.log(evt.keyCode)
  if (isAlphaNumeric(evt.keyCode)) {
    interactionState.searchDialogEnabled = true
    searchDialogEnable()
    document.getElementById('inputBar').focus()
  }

  function getSelectedNodes() {
    return displayGraph.nodes().filter(function(nodeId) {
      return displayGraph.node(nodeId).selectStatus === 'selected'
    })
  }

  if (evt.keyCode == 43) { // plus key
    getSelectedNodes().forEach(function(nodeId) {
      addNodeNeighbors(displayGraph, nodeId, 1)
    })
    d3Render(displayGraph)
  }

  if (evt.keyCode == 45) { // minus key
    getSelectedNodes().forEach(function(nodeId) {      
      removeNodeFromDisplay(nodeId)
    })
    d3Render(displayGraph)
  }
}

document.onkeydown = function(evt) {
  if (evt.keyCode == 17) {
    interactionState.ctrlDown = true
  }

  if (evt.keyCode == 27) { // the escape key
    if (interactionState.searchDialogEnabled)
      searchDialogDisable()
  }

}

document.onkeyup = function(evt) {
  if (evt.keyCode == 17) {
    interactionState.ctrlDown = false
  }
}


console.log('viewport dimensions: ' + width + ', ' + height)

// create svg for working out dimensions necessary for rendering labels' text
var hiddenSVG = d3.select('body').append('svg:svg').attr('width', 0).attr('height', 0)

var svgText   = hiddenSVG.append('svg:text')
                         .attr('y', -500)
                         .attr('x', -500)
                         .style('font-size', sphereFontSize)

var presentationSVG = d3.select('body').append('svg:svg').style('position', 'aboslute').style('z-index', 0)
  
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

function setSvgDefs() {
  var svgDefSection = presentationSVG.append("svg:defs")

  // arrow-head svg definition
  function setUsesShapeDef(length, ratio) {

    var shortEdgeLength = length * ratio

    var path = 'M0,0' + 
               'L0,' + shortEdgeLength +
               'L' + length + ',' + (shortEdgeLength/2) +
               'L0,0'

    svgDefSection.selectAll("marker")
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
  }; setUsesShapeDef(10, 0.5)

  function setMyRadialGradientDef() {

    var gradientDef = svgDefSection
                     .selectAll("MyRadialGradientDef").data(["MyRadialGradientDef"]).enter().append("svg:radialGradient")
                     .attr("id", "MyRadialGradientDef")

    gradientDef
    .append("svg:stop")
      .attr('offset', '30%')
      .attr('stop-color', 'green')

    gradientDef
    .append("svg:stop")
      .attr('offset', '90%')
      .attr('stop-color', d3.rgb('blue').brighter(1))

  }; setMyRadialGradientDef()

  function setMyLinearGradientDef() {

    var gradientDef = svgDefSection
                     .selectAll("MyLinearGradientDef").data(["MyLinearGradientDef"]).enter().append("svg:linearGradient")
                     .attr("id", "MyLinearGradientDef")

    gradientDef
    .attr('x1', '0')
    .attr('y1', '1')
    .attr('x2', '0')
    .attr('y2', '0')

    gradientDef
    .append("svg:stop")
      .attr('offset', '50%')
      .attr('stop-color', 'white')
    
    gradientDef
    .append("svg:stop")
      .attr('offset', '100%')
      .attr('stop-color', 'red')

  }; setMyLinearGradientDef()    

}; setSvgDefs()

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

function formattedText(node) {

  function splitByLengthAndCamelOrWord(text) {
    function isUpperCase(char) {
      return (char >= 'A' && char <= 'Z') // is this locale safe?
    }

    for (i = 0; i < text.length; i++)
    {
      if (i > 0)
        if ((!isUpperCase(text.charAt(i-1)) && isUpperCase(text.charAt(i))) || // camel case transition
            text.charAt(i-1) == ' ')                                           // new word
              if (i > 3)
                return [text.slice(0, i)].concat(splitByLengthAndCamelOrWord(text.slice(i)))

      if (i == text.length-1) return [text]
    }
  }

  //var text = [node.kind]
  var text = []
  
  var splitName = splitByLengthAndCamelOrWord(node.displayName)

  splitName.forEach(function(line) {
    text.push(line)
  })

  return text
}

function calcBBox(node) {
  svgText.selectAll('tspan').remove()
  formattedText(node).forEach(function(line) {
    svgText.append('tspan')
                 .attr("text-anchor", "middle")
                 .attr('x', 0)
                 .attr('dy', '1.2em')
                 .text(line)    
  })
  return svgText.node().getBBox()
}

function adjustNames(node) {
  if (node.kind == 'anonymous class' && node.name == '$anon') {
    node.name = 'unnamed class'
    node.displayName = node.name
  }

  if (node.kind == 'value' && node.name.indexOf('qual$') == 0) {
    node.name = 'unnamed value'
    node.displayName = node.name
  }

  if (node.kind == 'constructor' && node.name == '<init>') {
    node.name = 'constructor'
    node.displayName = node.name
  }

  if (node.kind == 'method' && node.name.indexOf('<init>$default$') == 0) {
    node.name = 'default argument'
    node.displayName = node.name
  }

  if (node.kind == 'value' && node.name.indexOf('x0$') == 0) { // a block argument
    node.name = 'a block argument'
    node.displayName = node.name
  }

  if (node.kind == 'lazy value') { // because showing laziness seems a little over of scope...
    node.kind = 'value'
  }
}

function loadNodes(callback){
  console.log('loading nodes')
  d3.csv('canve-data/nodes', function(err, inputNodes) {
    if (err) console.error(err)
    else {
      console.log('raw input nodes: '); console.dir (inputNodes)
      
      inputNodes.forEach(function(node) {

        adjustNames(node)

        if (node.displayName === undefined) 
          node.displayName = node.kind + ' ' + node.name

        bbox = calcBBox(node)
        globalGraph.setNode(node.id, { name:         node.name, 
                                       kind:         node.kind, 
                                       displayName:  node.displayName,
                                       notSynthetic: node.notSynthetic,
                                       definition:   node.definition,
                                       textBbox:     bbox })

      })

      console.log('nodes: '); console.dir(globalGraph.nodes())
      
      console.log('loading sources, this may take a while...'); 
      
      //console.log('skipping preemptive source loading')
      callback()
      getSources(function(){})
    }
  })
}

function ownerShipNormalize(edge){
  // make an 'owned by' edge equivalent to a 'declares member' edge
  // the nature of the real-world difference will be sorted out by using this
  // code, but as it currently stands they are considered just the same here.
  // in the end, this will be handled in the Scala code itself
  if (edge.edgeKind == 'owned by') {
    t = edge.id1; edge.id1 = edge.id2; edge.id2 = t; // swap edge's direction
    edge.edgeKind = 'declares member'
  }
}

function loadEdges(callback){
  console.log('loading edges')
  d3.csv('canve-data/edges', function(err, inputEdges) {
    if (err) console.error(err)
    else {
      console.log('input edges: '); console.dir(inputEdges)

      inputEdges.forEach(function(edge) {
        ownerShipNormalize(edge)
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


function getSources(callback) {
  sourceMap = {}
  
  // filter down the nodes that are defined in the project itself rather than 
  // imported from outside, as only for these nodes, their source should be fetched
  var projectNodes = globalGraph.nodes().filter(function(nodeId) { 
    return (globalGraph.node(nodeId).definition === 'project')
  })

  // asynchronously fetch the sources for those nodes
  var asyncPending = 0
  var sources = 0
  projectNodes.forEach(function(nodeId) {
    asyncPending += 1
    d3.text('canve-data/' + 'node-source-' + nodeId, function(err, nodeSource) {
      if (err) console.error(err)
      else {
        sourceMap[nodeId] = nodeSource
        sources += 1
      }
      asyncPending -= 1
    })
  })

  // check source fetching progress status every interval
  var interval = window.setInterval(function() {
    console.log(asyncPending + ' sources still pending loading')
    if (asyncPending == 0) {
      clearInterval(interval)

      if (sources == projectNodes.length) 
        console.log('done fetching all sources')
      else
        console.warn('failed fetching some sources')

      callback()      
    }
  }, 300) // the interval length in ms
}

function initRadii() {
  function radiusByEdges(nodeId) { 
    return Math.log(globalGraph.nodeEdges(nodeId).length * 250) 
  }

  globalGraph.nodes().forEach(function(nodeId) {
    globalGraph.node(nodeId).collapsedRadius = radiusByEdges(nodeId)
    globalGraph.node(nodeId).radius = globalGraph.node(nodeId).collapsedRadius
  })
}

function onDataLoaded(callback) {
  //if (Object.keys(sourceMap).length != globalGraph.nodes().length)
  //  console.warn('number of sources does not equal the number of nodes')

  console.log('data loading done')

  applyGraphFilters()
  
  debugListSpecialNodes() // show what special nodes still slip through the filters

  initRadii()

  console.log('data filters applied')

  displayGraph = new dagre.graphlib.Graph({ multigraph: true}); // directed graph, allowing multiple edges between two nodes
  displayGraph.setGraph({}) 

  d3ForceLayoutInit()

  window.onresize = function() {
    windowResizeHandler()
    d3Render(displayGraph)
  }

  initAwesomplete()
  //fireGraphDisplay(87570)
  //fireGraphDisplay(35478)
  //fireGraphDisplay(8464)
  //fireGraphDisplay(8250)

  //getUnusedTypes(globalGraph).forEach(fireGraphDisplay)
  unusedTypes = getUnusedTypes(globalGraph)
  console.log(unusedTypes.length + ' unused project types detected')
  console.log(unusedTypes)
  fireGraphDisplay(unusedTypes[0])
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

function removeWithEdges(graph, nodeId) {
  //console.log(nodeId)
  graph.nodeEdges(nodeId).forEach(function(edge) { graph.removeEdge(edge)})
  graph.removeNode(nodeId)
}

// return direct callers of a node
function directUsers(graph, nodeId) {
  var callers = graph.nodeEdges(nodeId).filter(function(edge) { 
    return (edge.w == nodeId && 
            graph.edge(edge).edgeKind === 'uses')
  })
  return callers
}

// this may ultimately go to a separate output file for easy audit and/or test enablement
function logInputGraphPreprocessing(text) {
  console.log(text)
}

//
// filter out non-informative nodes from the global graph
//
function applyGraphFilters() {

  // filter away everything in certain external packages, other than their usage itself 
  // made in the project's code
  function filterExternalPackageChains() {
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

  function variousFilters() {
    globalGraph.nodes().forEach(function(nodeId) {
      var node = globalGraph.node(nodeId)

      // The compiler creates default anonymous methods for copying the arguments passed
      // to a case class. They do not convey any useful information, hence filtered.
      if (node.kind == 'method' && node.name.indexOf('copy$default') == 0) {
        logInputGraphPreprocessing('removing case class default copier ' + node.name + ' (and its edge)')
        removeWithEdges(globalGraph, nodeId)
      }

      // similar to the above, it appears these just apply the default copy methods
      if (node.kind == 'method' && node.name.indexOf('apply$default') == 0) {
        logInputGraphPreprocessing('removing default applier ' + node.name + ' (and its edge)')
        removeWithEdges(globalGraph, nodeId)
      }

      // redundant method definition created for some traits
      if (node.kind == 'method' && node.name === '$init$') {
        logInputGraphPreprocessing('removing redundant trait init method ' + node.name + ' (and its edge)')
        removeWithEdges(globalGraph, nodeId)
      }

      // 
      if (node.kind == 'value' && node.name.indexOf('x$') == 0)  // unnamed value
        if (directUsers(globalGraph, nodeId).length == 0) {      // that is not used
          logInputGraphPreprocessing('removing unnamed and unused value ' + node.name + ' (and its edges)')
          removeWithEdges(globalGraph, nodeId)
      }
    })
  }

  filterExternalPackageChains()
  variousFilters()
  collapseValRepresentationPairs()
}
  
// Collapses all val pairs that represent a single val each.
//
// Rational: the compiler will generate two vals for each val found 
// in the code being compiled. Here we collapse them,
// as the duplication seems not to add any 
// informative value.
//
// Note that it is better to keep this as a separate function,
// in case inter-relationships between such pairs emerge
// in further testing.
//
function collapseValRepresentationPairs() {
  function getValRepresentationPairs() {
    var valRepresentationPairs = []
      globalGraph.edges().forEach(function(edge) {
        if (globalGraph.node(edge.v).name == globalGraph.node(edge.w).name)
          if (globalGraph.node(edge.v).kind == 'value' && globalGraph.node(edge.w).kind == 'value')
            if (edge.w - edge.v == 1) // is this really a requirement?
              if (globalGraph.edge(edge).edgeKind == 'uses') 
                valRepresentationPairs.push(edge)
      })

    a = valRepresentationPairs
    return valRepresentationPairs
  }
  
  getValRepresentationPairs().forEach(function(edge){
    logInputGraphPreprocessing('deduplicating value representation pair ' + 
                                edge.v + ' -> ' + edge.w + ' by removing ' + edge.w + ' alltogether')
    removeWithEdges(globalGraph, edge.w)
  })
}

function passiveEdgeKindVoice(edgeKind) {
  if (edgeKind == 'declares member') return 'declared by'
  if (edgeKind == 'extends')         return 'extended by'
  if (edgeKind == 'is of type')      return 'instantiated as'
  if (edgeKind == 'uses')            return 'used by'
}

function describe(graph, edge) {
  edgeKind = graph.edge(edge).edgeKind

  return edgeKind + ' ' + 
         graph.node(edge.w).displayName
}

function describeReversed(graph, edge) {
  edgeKind = graph.edge(edge).edgeKind

  return passiveEdgeKindVoice(edgeKind) + ' ' + 
         graph.node(edge.v).displayName
}

function logNodeNeighbors(graph, nodeId) {
  
  console.log('')
  console.log(graph.node(nodeId).displayName + ':')

  graph.nodeEdges(nodeId).forEach(function(edge) {
    edgeKind = graph.edge(edge).edgeKind
    
    if (nodeId == edge.v) 
      console.log(describe(graph,edge))
    if (nodeId == edge.w) 
      console.log(describeReversed(graph, edge))
  })

  console.log('')
}

function debugListSpecialNodes() {
  
  globalGraph.edges().forEach(ownerShipNormalize)

  globalGraph.nodes().forEach(function(nodeId){
    if (globalGraph.node(nodeId).name.indexOf('$') > 0) console.log(globalGraph.node(nodeId).name)
  })
}

function fetchData(callback) {
  // callback-hell-style flow control for all data loading
  loadNodes(function(){loadEdges(onDataLoaded)})
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

// recompute and adjust the node rim's style, 
// based on the intersection of two state properties.
// (we currently leave the transition duration to the caller, as this 
// function currently doesn't deal with the source state only the target state).
function adjustedNodeRimVisualization(node, transitionDuration) {

  var color
  var width

  // matrix for computing the appropriate style
  if (node.selectStatus == 'selected'    &&  node.highlightStatus == 'highlighted')
    { color = d3.rgb('red').darker(1); width = 4; }

  if (node.selectStatus == 'selected'    &&  node.highlightStatus == 'unhighlighted')
    { color = d3.rgb('red').darker(1); width = 2 }

  if (node.selectStatus == 'unselected'  &&  node.highlightStatus == 'highlighted')
    { color = 'orange'; width = 2 }

  if (node.selectStatus == 'unselected'  &&  node.highlightStatus == 'unhighlighted') 
    { color = '#fff'; width = 1 }

  if (transitionDuration === undefined) transitionDuration = 0

  // apply the style
  var selector = '#node' + node.id
  presentationCircle = presentationSVG.select(selector).select(".circle")

  presentationCircle
  .transition('nodeHighlighting').duration(transitionDuration)
  .style('stroke', color)
  .style('stroke-width', width)
}

function toggleHighlightState(nodeId, targetState) {

  var node = displayGraph.node(nodeId)

  //console.log(node.selectStatus)
  //if (node.selectStatus == 'selected') return

  if (targetState == 'highlight') {
    node.highlightStatus = 'highlighted'
    adjustedNodeRimVisualization(node, 200)
  }

  if (targetState == 'unhighlight') {
    node.highlightStatus = 'unhighlighted'
    adjustedNodeRimVisualization(node, 500)
  }
}

function removeNodeFromDisplay(nodeId) {
  removeWithEdges(displayGraph, nodeId)
}

function addNodeToDisplay(id) {
  if (displayGraph.node(id) === undefined) {   
    var node = globalGraph.node(id)
    node.expandStatus    = 'collapsed'
    node.selectStatus    = 'unselected'
    node.highlightStatus = 'unhighlighted'
    displayGraph.setNode(id, node)  
  }
}

// add node neighbors and render them
function addAndRenderNeighbors(graph, id, degree) {
  addNodeNeighbors(displayGraph, node.id, 1)
  d3Render(displayGraph)
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
  // for any humbly large degree, this needs to be re-implemented for efficient Big O(V,fembelish),
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

  //if (displayGraph.node(nodeId) === undefined) {
  console.log('not yet defined')
  getNodeEnvGraph(nodeId, 1) 

  // this creates a dagre initial layout that is unfortunately 
  // not bound to the window's viewport but may
  // be much much larger.
  //dagre.layout(displayGraph) 
  //console.log('dagre layout dimensions: ' + displayGraph.graph().width + ', ' + displayGraph.graph().height)

  console.log(displayGraph)
  console.log('nodes: ' + displayGraph.nodes().length + ', ' + 'edges: ' + displayGraph.edges().length)
  console.log('layout computed')

  // computeCirclePack(dispyChain(nodeId)) // we don't do anything with it right now

  d3Render(displayGraph)

  // do the following both whether the node was already on the display or not

  var node = displayGraph.node(nodeId)

  var selector = '#node' + nodeId
  presentationSVG.select(selector).select(".circle")
    .transition('nodeHighlighting').duration(500).style('stroke', 'orange').style('stroke-width', 6)
    .each('end', function() { 
      adjustedNodeRimVisualization(node, 2000)
    })
  
  if (node.expandStatus === 'collapsed') expandNode(node)
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
            suggestedElem.appendChild(document.createTextNode(node.data.displayName + ' (' + node.id + ')'))
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
    replace: function(text) { // gathers the node id of the selection
      var id = text.substring(text.indexOf('(') + 1, text.indexOf(')'))
      var node = globalGraph.node(id)

      console.log('user selected ' + text)
      
      fireGraphDisplay(id)

      searchDialogDisable()
    }
  })

  function initAwesompleteDisplay() {
    awesompleteContainerDiv.style.width = '60%'
    awesompleteContainerDiv.style.margin = '5% 0% 20% 20%'

    var awesompleteAutoDiv = document.getElementsByClassName("awesomplete")[0]
    awesompleteAutoDiv.style.width  = '100%'

    inputBar.style.width  = '100%'

    searchDialogEnable()

  }; initAwesompleteDisplay()

  window.addEventListener("awesomplete-selectcomplete", function(e) {
    // User made a selection from dropdown. 
    // This is fired after the selection is applied
  }, false)

  //getFirstResultEnv('signature')
}

function SetOrUpdateD3Data(displayGraph) {
  //
  // transform the input graph to a d3 input graph,
  // such that d3 indexing is contiguous. Is that really a d3 required?
  //
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
                         .gravity(0.4)
                         .linkDistance(20)
                         .charge(-150)
                         .size([presentationSVGWidth, presentationSVGHeight])
                         .on("tick", tick)

  drag = forceLayout.drag()

    .on('dragstart', function (d) { 
      dragStartMouseCoords = d3.mouse(presentationSVG.node())

      //Math.abs(mouseUpRelativeCoords[0] - mouseDownRelativeCoords[0]) < 10 && 
    })

    .on('dragend', function (node) { 
      // determine d3 drag-end v.s. a click, by mouse movement
      // (this is the price of using the d3 drag event, 
      //  see e.g. // see http://stackoverflow.com/questions/19931307/d3-differentiate-between-click-and-drag-for-an-element-which-has-a-drag-behavior)

      if (interactionState.longStablePressEnd) return

      dragEndMouseCoords = d3.mouse(presentationSVG.node())

      if (Math.abs(dragStartMouseCoords[0] - dragEndMouseCoords[0]) == 0 && 
          Math.abs(dragStartMouseCoords[1] - dragEndMouseCoords[1]) == 0) {
          // consider it a "click"

          // is the ctrl key down during the click?

          console.log(interactionState.ctrlDown)
          if (interactionState.ctrlDown) toggleNodeSelect(node)
          else toggleNodeExpansion(node)
      }
      else {
        // consider it a drag end
        node.fixed = true // fix the node
      }
    })
}

function toggleNodeExpansion(node) {
  console.log("status on click: " + node.expandStatus)
  if      (node.expandStatus === 'collapsed') expandNode(node)
  else if (node.expandStatus === 'expanded') collapseNode(node)
}

function toggleNodeSelect(node) {
  if      (node.selectStatus === 'unselected') {
    node.selectStatus = 'selected'
    adjustedNodeRimVisualization(node, 500)
  }
  else if (node.selectStatus === 'selected') {
    node.selectStatus = 'unselected'
    adjustedNodeRimVisualization(node, 500)
  }
}

function expandNode(node) {

  console.log("expanding node")

  node.expandStatus = 'expanded'

  // assign expanded radisu based on the bounding box needed for rendering the text,
  // plus some padding of the same size as the active font size
  var expandedRadius = Math.max(node.textBbox.width, node.textBbox.height)/2 + sphereFontSize 
  node.radius = expandedRadius

  extendExpandedNodeEdges(node)
  
  var selector = '#node' + node.id
  presentationSVG.select(selector).each(function(group) { 
    var g = d3.select(this)
    g.select(".circle")
      .transition('nodeResizing').duration(200).attr("r", node.radius).attr('stroke-width', Math.max(3, Math.sqrt(node.radius)/2))
      .each("end", function(node) {
        var svgText = g.append("text")
                        .style('font-size', sphereFontSize)
                        .style("fill", "#fff")
                        .style('stroke-width', '0px')
                        .attr("text-anchor", "middle")
                        .attr('alignment-baseline', "middle")
                        .attr('y', -(node.textBbox.height/4))
                        .style("cursor", "pointer")
                        .attr('pointer-events', 'none')
        
        formattedText(node).forEach(function(line, i) {
          svgText.append('tspan')
                 .attr('x', 0)
                 .attr('dy', function() {
                   if (i == 0) return 0
                   else return '1.2em'
                 })
                 .text(line)    
        })
    })
  })

  logNodeNeighbors(globalGraph, node.id)

  if (node.definition == 'project') 
    showSourceCode(node)
  if (node.definition == 'external') 
    console.log(node.displayName + ' is defined externally to the project being visualized')

  d3Render(displayGraph)

}

function collapseNode(node) {
  /*
  var supershape = d3.superformula()
                     .type("rectangle")
                     .size(1000)
                     .segments(3600);
                     */

  console.log("collapsing node")

  node.expandStatus = 'collapsed'
  node.radius = node.collapsedRadius

  var selector = '#node' + node.id
  presentationSVG.select(selector).each(function(group) { 
    var g = d3.select(this)
    g.selectAll("text").remove()
    g.select(".circle")
      .transition('nodeResizing').duration(400).attr("r", node.radius) 
  })
  //.each("end", function(d) { d.append("text").text(d.kind + ' ' + d.name) })
                 //.attr("class", "tooltip")


  d3Render(displayGraph)

}


//
// given that we already reset the edges's length such 
// expanded nodes cannot overlap their conncections,
// is this still necessary?
//
function avoidOverlaps() {

  function collide(node) {
    
    //console.log('radius')
    //console.log(node.x)
    var r = node.radius + 16,
        nx1 = node.x - r,
        nx2 = node.x + r,
        ny1 = node.y - r,
        ny2 = node.y + r;
    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = node.radius + quad.point.radius
        if (l < r) {
          l = (l - r) / l * .5
          node.x -= x *= l
          node.y -= y *= l
          quad.point.x += x
          quad.point.y += y
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    }
  }

  var nodes = d3DataBind.nodesJson
  var q = d3.geom.quadtree(nodes),
      i = 0,
      n = nodes.length;

  while (++i < n) q.visit(collide(nodes[i]));
}

function tick(additionalConstraintFunc) {

  function keepWithinDisplayBounds() {

    d3DisplayNodes.each(function(g) { 
      d3.select(this).select(".circle").each(function(d){
        radius = parseInt(d3.select(this).attr('r')) // the use of d3 selections is superfluous if radius is included in the base data node already
        if (d.x < radius) d.x = radius
        if (d.y < radius) d.y = radius
        if (d.x > presentationSVGWidth - radius) d.x = presentationSVGWidth - radius
        if (d.y > presentationSVGHeight - radius) d.y = presentationSVGHeight - radius
      })
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

/*
    d3DisplayNodes.each(function(g) { 
                  d3.select(this).select(".circle")
                  .attr("cx", function(d) { count++; return d.x; })
                  .attr("cy", function(d) { return d.y; })
    })*/

    d3DisplayNodes.attr("transform", function(d, i) {     
        return "translate(" + d.x + "," + d.y + ")"; 
    })

    d3ExtensionArcs.attr("d", function(edge) {
      //return "d","M 0 60 L 50 110 L 90 70 L 140 100"
      //return ('M ' + parseInt(edge.source.x -40) + ' ' + parseInt(edge.source.y) + ' ' +
      //        'L ' + parseInt(edge.source.x + 40) + ' ' + parseInt(edge.source.y))
      var edgeRadius = edge.source.radius * 1.3
      return ('M' + (edge.source.x - edgeRadius) + ',' + (edge.source.y) + 
              ' A1,1 0 0 1 ' +
              + (edge.source.x + edgeRadius) + ',' + (edge.source.y))
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

  avoidOverlaps()

  keepWithinDisplayBounds()

  if (typeof additionalConstraintFunc === 'function') additionalConstraintFunc()
  
  syncView()
  // forceLayout.stop() // show dagre layout without really letting the force layout
}

function nodeColor(node) { 
  if (node.kind == 'trait')           return d3.rgb('blue').darker(2)
  if (node.kind == 'class')           return d3.rgb('blue').brighter(1)
  if (node.kind == 'object')          return d3.rgb('blue').brighter(1.6)
  if (node.kind == 'anonymous class') return d3.rgb('gray').brighter(0.9)
  if (node.kind == 'method')          
    if (node.name.indexOf('$') > 0)   return d3.rgb('gray').brighter(0.9)
    else                              return d3.rgb('green')
  if (node.kind == 'constructor')     return 'url(#MyRadialGradientDef)'
  if (node.kind == 'value')           return d3.rgb('green').brighter(1.3)
  if (node.kind == 'package')         return d3.rgb('white').darker(2)
}

function extendExpandedNodeEdges(node) {

  // seems the api requires specifying the distance for each edge,
  // without any option to keep some edges unchanged,
  // so this is more tedious that it could have been.
  forceLayout.linkDistance(function (link) {
    //if (link.source == node || link.target == node)
    return Math.max(20, displayGraph.node(link.source.id).radius + displayGraph.node(link.target.id).radius + 10)
  })
}

function showSourceCode(node) {
    
    console.log('')
    console.log('Source Code for ' + node.displayName + ':')
    console.log(sourceMap[node.id])
    console.log('')
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
        if (edge.edgeKind == 'is of type')      return d3.rgb('blue')
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
        if (edge.edgeKind == 'is of type')      return "4,3"
        if (edge.edgeKind == 'uses')            return "none"
      })


  var extendEdges = d3DataBind.linksJson.filter(function(edge) { 
    if (edge.edgeKind == 'extends')    return true
    if (edge.edgeKind == 'is of type') return true
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
    .enter().append("g").attr("class", "node")
    .attr("id", function(node) { // for allowing indexed access
      return 'node' + node.id
    })
    .call(drag)

    .append("circle")
    .attr("class", "circle")
    .attr("r", function(node) { return node.radius })
    .style("fill", nodeColor)
    .style("cursor", "pointer")

    .append("title") // this is the default html tooltip definition
      .attr("class", "tooltip")
      .text(function(d) { return d.displayName + ' (debug id ' + d.id + ')' })

  d3DisplayNodes
    .on('mousedown', function(node) {
      mouseDown = new Date()
      mouseDownCoords = d3.mouse(presentationSVG.node())
      interactionState.longStablePressEnd = false
    })

    .on('mouseup', function(node) {
      mouseUp = new Date()

      mouseUpCoords = d3.mouse(presentationSVG.node())

      if (mouseUp.getTime() - mouseDown.getTime() > 500) 
        if (Math.abs(mouseUpCoords[0] - mouseDownCoords[0]) < 10 && 
            Math.abs(mouseUpCoords[1] - mouseDownCoords[1]) < 10) {
              interactionState.longStablePressEnd = true
              console.log('long stable click')
              node.fixed = false
        }
              //superShape(node)          
    })

    .on('dblclick', function(node) {
      console.log('in double click')
      //console.log(node.id)
      //node.fixed = true

      //console.log("node")
      //console.log(node) 

      //console.log(displayGraph.nodes().length)
    })

    //
    // mouse over and mouse out events use a named transition (see https://gist.github.com/mbostock/24bdd02df2a72866b0ec)
    // in order to both not collide with other events' transitions, such as the click transitions, 
    // and to cancel each other per.
    // 

    .on('mouseover', function(node) { // see better implementation at http://jsfiddle.net/cuckovic/FWKt5/
      for (edge of displayGraph.nodeEdges(node.id)) {
        // highlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 3)
        // highlight its nodes
        toggleHighlightState(edge.v, "highlight")
        toggleHighlightState(edge.w, "highlight")
      }
    })

    .on('mouseout', function(node) {
      for (edge of displayGraph.nodeEdges(node.id)) {
        // unhighlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 1).delay(300)
        // unhighlight its nodes
        toggleHighlightState(edge.v, "unhighlight")
        toggleHighlightState(edge.w, "unhighlight")
      }
    })

  d3DisplayNodes.exit().on('mousedown', null) 
                       .on('mouseup', null)
                       .on('dblclick', null)
                       .on('mouseover', null)
                       .on('mouseout', null)

  d3DisplayNodes.exit().transition('showOrRemove').delay(1000)
                       .duration(2500).ease('poly(2)')
                       .style('fill-opacity', 0).style('stroke-opacity', 0).remove()
  d3DisplayLinks.exit().transition('showOrRemove')
                       .duration(0).style('stroke-opacity', 0).remove()
  d3ExtensionArcs.exit().transition('showOrRemove')
                       .duration(0).style('fill-opacity', 0).style('stroke-opacity', 0).remove()

  function superShape(node) {
    // consider using https://github.com/popkinj/polymorph instead.
    var supershape = d3.superformula()
                       .type("rectangle")
                       .size(1000)
                       .segments(3600);

    var selector = '#node' + node.id
  }

  //console.log(d3DataBind.nodesJson.length)
  //console.log(d3DataBind.nodesJson.length)
  //console.log(d3DataBind.linksJson.length)
  forceLayout.nodes(d3DataBind.nodesJson)
             .links(d3DataBind.linksJson)
             .start()

  forceLayout.on("end", function() {
    console.log('layout stable')
  })
}

function getMembers(graph, nodeId) {
  return graph.nodeEdges(nodeId).filter(function(edge) {
    return edge.v == nodeId &&
           edge.edgeKind == 'declares member'
  }).map(function(edge) {
    return edge.w
  })
}

function getUsers(graph, nodeId) {
  return graph.nodeEdges(nodeId).filter(function(edge) {
    return edge.w == nodeId &&
           graph.edge(edge).edgeKind == 'uses' 
  }).map(function(edge) {
    return edge.v
  })
}

// list unused types (unextended, uninstantiated, or having no members being used).
function getUnusedTypes(graph) {
  
  // this is a naive implementation that assumes 
  // there is not a lot of type nesting -
  // it doesn't try to avoid some repetition

  function isTypeNode(nodeId) {
    return graph.node(nodeId).kind == 'class'  || 
           graph.node(nodeId).kind == 'object' ||
           graph.node(nodeId).kind == 'trait'
  }

  function getTypeUsers(nodeId) {
    // is anyone using it?
    var users = 0
    graph.nodeEdges(nodeId).forEach(function(edge) {
      if (edge.w == nodeId) {
        if (graph.edge(edge).edgeKind == 'extends')    users += 1
        if (graph.edge(edge).edgeKind == 'is of type') users += 1
        if (graph.edge(edge).edgeKind == 'uses')       users += 1
      }
    }) 

    // is anyone using its subtypes if any?
    graph.nodeEdges(nodeId).forEach(function(edge) {
      if (edge.v == nodeId) {
        if (graph.edge(edge).edgeKind == 'declares member')
          if (isTypeNode(edge.w))
            users += getTypeUsers(edge.w).length
      }
    }) 

    // is it an object being used without "instantiation"?
    // in such case should check if any of its members are being used,
    // because the compiler will not indicate any other form of usage 
    // in this case
    if (graph.node(nodeId).kind == 'object')
      getMembers(graph, nodeId).forEach(function(memberNode) {
        users += getUsers(graph, memberNode).length
      })

    return users
  }

  var projectNodes = graph.nodes().filter(function(nodeId) {
    return graph.node(nodeId).definition === 'project'
  })

  var projectTypeNodes = projectNodes.filter(function(nodeId) {
    return isTypeNode(nodeId)
  })

  return projectTypeNodes.filter(function(nodeId) {
    return getTypeUsers(nodeId) == 0
  })

}
