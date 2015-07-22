console.log("javascript started")

var graph = new dagre.graphlib.Graph();
graph.setGraph({});

function getNodes(callback){
  console.log('loading nodes')
  d3.csv('cae-data/nodes', function(err, inputNodes) {
    if (err) console.error(err)
    else {
      console.log("input nodes: "); console.dir (inputNodes)
      inputNodes.forEach(function(node) {
        // TODO: get bounding box size required for rendering the label 
        graph.setNode(node.id, { name: node.name, kind: node.kind, width:10, height:10 })
      })
      console.log("nodes: "); console.dir(graph.nodes())
      
      console.log('loading sources, this may take a while'); getSources(callback)
    }
  })
}

function getEdges(callback){
  console.log('loading edges')
  d3.csv('cae-data/edges', function(err, inputEdges) {
    if (err) console.error(err)
    else {
      console.log("input edges: "); console.dir(inputEdges)
      inputEdges.forEach(function(edge) {
        // TODO: get bounding box size required for rendering the label 
        graph.setEdge(edge.id1, edge.id2, { edgeKind: edge.edgeKind });
      })
      console.log("edges: "); console.dir(graph.edges())

      inputEdges.forEach(function(edge) {
        if (graph.edge({v:edge.id1, w:edge.id2}) === undefined)
          console.warn("input edge " + edge  + " failed to initialize as a graphlib edge")
      })

      callback()
    }
  })
}

sourceMap = {}

// recursively fetch source for all nodes, synchronously
function getSources(callback, i) {
  i = i+1 || 0; if (i == graph.nodes().length) callback()
  else {
    id = graph.nodes()[i]
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
  if (Object.keys(sourceMap).length != graph.nodes().length)
    console.warn('number of sources does not equal the number of nodes')
  else 
    console.log('data loading done')
}

function fetchData(callback) {
  // callback-hell-style flow control for all data loading
  getNodes(function(){getEdges(verifyDataLoad)})
}


fetchData()

//dagre.layout(g);

//console.log("layout computed")



/*
g.nodes().forEach(function(v) {
     console.log("Node " + v + ": " + JSON.stringify(g.node(v)));
});
g.edges().forEach(function(e) {
    console.log("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(g.edge(e)));
});
*/

// validate the input data
if (graph.nodes().filter(
  function(node) {
  return g.node(node) === undefined
}).length > 0)
  console.error("internal error: nodes without values should not exist")

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
        return { "id": edge.w, node: g.node(edge.w) }
      })
}

function parentChain(nodeID) {
  
}