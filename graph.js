console.log("javascript started")

var g = new dagre.graphlib.Graph();

g.setGraph({});




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
if (g.nodes().filter(
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