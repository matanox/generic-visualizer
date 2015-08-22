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
    interactionState.ctrlDown - false
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
  
  var splitName = splitByLengthAndCamelOrWord(node.name)

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

function loadNodes(callback){
  console.log('loading nodes')
  d3.csv('cae-data/nodes', function(err, inputNodes) {
    if (err) console.error(err)
    else {
      console.log('input nodes: '); console.dir (inputNodes)
      inputNodes.forEach(function(node) {
        bbox = calcBBox(node)
        //console.log(bbox)
        globalGraph.setNode(node.id, { name:   node.name, 
                                       kind:   node.kind, 
                                       textBbox: bbox })
      })
      console.log('nodes: '); console.dir(globalGraph.nodes())
      
      console.log('loading sources, this may take a while...'); 
      
      //console.log('skipping preemptive source loading')
      callback()
      getSources(function(){})
    }
  })
}

function loadEdges(callback){
  console.log('loading edges')
  d3.csv('cae-data/edges', function(err, inputEdges) {
    if (err) console.error(err)
    else {
      console.log('input edges: '); console.dir(inputEdges)
      inputEdges.forEach(function(edge) {
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
  if (Object.keys(sourceMap).length != globalGraph.nodes().length)
    console.warn('number of sources does not equal the number of nodes')

  console.log('data loading done')

  applyGraphFilters()
  
  dataEmbelish()

  initRadii()

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
function applyGraphFilters() {

  // this may ultimately go to a separate output file for easy audit and/or test enablement
  function logInputGraphPreprocessing(text) {
    console.log(text)
  }

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

  // The compiler creates default anonymous methods for copying the arguments passed
  // to a case class. They do not convey any useful information, hence filtered.
  function filterCaseClassDefaultCopiers() {
    globalGraph.nodes().forEach(function(nodeId) {
      var node = globalGraph.node(nodeId)
      if (node.kind == 'method' && node.name.indexOf('copy$default') == 0)

        logInputGraphPreprocessing('removing case class default copier ' + node.name + ' (and its edge)')

        //globalGraph.nodeEdges(nodeId).forEach(function(edge) { globalGraph.removeEdge(edge)})
        //globalGraph.removeNode(nodeId)

    })
  }

  filterExternalPackageChains()
  filterCaseClassDefaultCopiers()
}
//
// embelish the graph with more humane node names for special cases, and the like
//
function dataEmbelish() {

  function ownerShipNormalize(edge){
    // make an 'owned by' edge equivalent to a 'declares member' edge
    // the nature of the real-world difference will be sorted out by using this
    // code, but as it currently stands they are considered just the same here.
    // in the end, this will be handled in the Scala code itself
    if (globalGraph.edge(edge).edgeKind == 'owned by') {
      t = edge.id1; edge.id1 = edge.id2; edge.id2 = t; // swap edge's direction
      globalGraph.edge(edge).edgeKind = 'declares member'
    }
  }

  function embelishAnonymousClass(nodeId) {
    var node = globalGraph.node(nodeId)
    if (node.kind == 'anonymous class' && node.name == '$anon')
      node.name = 'unnamed class'
  }

  globalGraph.edges().forEach(ownerShipNormalize)

  globalGraph.nodes().forEach(embelishAnonymousClass)

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

function addNodeToDisplay(id) {
  var node = globalGraph.node(id)
  node.status = 'collapsed'
  displayGraph.setNode(id, node)  
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

  var selector = '#node' + nodeId
  presentationSVG.select(selector).select(".circle").style('stroke', 'orange').style('stroke-width', 3)
                                  .transition('mouseOvership').duration(7000).style('stroke', '#fff').style('stroke-width', 1)

  expandNode(displayGraph.node(nodeId))

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

      this.input.value = ''

      searchDialogDisable()
    }
  })

  function initAwesomepleteDisplay() {
    awesompleteContainerDiv.style.width = '60%'
    awesompleteContainerDiv.style.margin = '5% 0% 20% 20%'

    var awesompleteAutoDiv = document.getElementsByClassName("awesomplete")[0]
    awesompleteAutoDiv.style.width  = '100%'

    inputBar.style.width  = '100%'

    searchDialogEnable()

  }; initAwesomepleteDisplay()

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
      // determine drag-end v.s. click, by mouse movement
      // (this is needed with d3, see e.g. // see http://stackoverflow.com/questions/19931307/d3-differentiate-between-click-and-drag-for-an-element-which-has-a-drag-behavior)

      if (interactionState.longStablePressEnd) return

      dragEndMouseCoords = d3.mouse(presentationSVG.node())

      if (Math.abs(dragStartMouseCoords[0] - dragEndMouseCoords[0]) == 0 && 
          Math.abs(dragStartMouseCoords[1] - dragEndMouseCoords[1]) == 0) {
        console.log("status on click: " + node.status)
        if (node.status === 'collapsed') expandNode(node)
          else if (node.status === 'expanded') collapseNode(node)
      }
      else {
        // fix the node on drag end
        node.fixed = true
      }
    })
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
    
    console.log('Source Code:')
    console.log('------------')
    console.log(sourceMap[node.id])
}


function expandNode(node) {

  console.log("expanding node")

  node.status = 'expanded'

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

  //showSourceCode(node)

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

  node.status = 'collapsed'
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
      .text(function(d) { return d.kind + ' ' + d.name })

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
      console.log('mouseover')
      for (edge of displayGraph.nodeEdges(node.id)) {
        // highlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 3)
        // highlight its nodes
        var selector = '#node' + edge.v
        presentationSVG.select(selector).select(".circle").transition('mouseOvership').style('stroke', 'orange')
        var selector = '#node' + edge.w
        presentationSVG.select(selector).select(".circle").transition('mouseOvership').style('stroke', 'orange')
      }

      //if (node.status === 'collapsed') expandNode(node)
    })

    .on('mouseout', function(node) {
      console.log('mouseout')
      for (edge of displayGraph.nodeEdges(node.id)) {
        // highlight the edge
        var selector = '#link' + edge.v + 'to' + edge.w
        presentationSVG.select(selector).transition().style('stroke-width', 1).delay(300)
        // highlight its nodes
        var selector = '#node' + edge.v
        presentationSVG.select(selector).select(".circle").transition('mouseOvership').style('stroke', '#fff').duration(1000)
        var selector = '#node' + edge.w
        presentationSVG.select(selector).select(".circle").transition('mouseOvership').style('stroke', '#fff').duration(1000)
      }

      //collapseNode(node)
    })

  function superShape(node) {
    var supershape = d3.superformula()
                       .type("rectangle")
                       .size(1000)
                       .segments(3600);

    var selector = '#node' + node.id

    var radius = Math.min(presentationSVGWidth, presentationSVGHeight) / 2

    presentationSVG.select(selector).transition().duration(2000).attr("r", radius)

    d3Render(displayGraph)

    console.log(node)                   
    console.log(supershape)

    console.log('Source Code:')
    console.log('------------')
    console.log(sourceMap[node.id])
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

function filterEntryPoints(graph) {
  var entryPoints = []
  graph.nodes().forEach(function(nodeId) {
    var used = false
    graph.nodeEdges(nodeId).forEach(function(edge) {
      if (edge.w == nodeId) {
        if (graph.edge(edge).edgeKind == 'extends')    used = true
        if (graph.edge(edge).edgeKind == 'is of type') used = true
        if (graph.edge(edge).edgeKind == 'uses')       used = true
      }
    })
    if (!used) entryPoints.push(nodeId)
  })
  console.log(entryPoints.length)
  console.log(graph.nodes().length)
  return entryPoints
}