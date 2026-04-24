const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Your personal information - UPDATE THIS
const USER_ID = "radhikaganesh_14052006";
const EMAIL_ID = "rg0134@srmist.edu.in";
const COLLEGE_ROLL_NUMBER = "RA2311003040026";

// Helper function to validate node format
function isValidNode(node) {
    if (!node || typeof node !== 'string') return false;
    
    // Trim whitespace
    node = node.trim();
    
    // Check pattern: X->Y where X and Y are single uppercase letters
    const pattern = /^[A-Z]->[A-Z]$/;
    
    if (!pattern.test(node)) return false;
    
    // Extract parent and child
    const [parent, child] = node.split('->');
    
    // Check for self-loop
    if (parent === child) return false;
    
    return true;
}

// Helper function to parse node
function parseNode(node) {
    const trimmed = node.trim();
    const [parent, child] = trimmed.split('->');
    return { parent, child };
}

// Helper function to build tree structure
function buildTree(edges, root) {
    const tree = {};
    
    function build(node) {
        const result = {};
        const children = edges
            .filter(edge => edge.parent === node)
            .map(edge => edge.child);
        
        for (const child of children) {
            result[child] = build(child);
        }
        return result;
    }
    
    tree[root] = build(root);
    return tree;
}

// Helper function to calculate depth
function calculateDepth(edges, root) {
    if (!edges.length) return 1;
    
    const children = edges.filter(edge => edge.parent === root).map(edge => edge.child);
    
    if (children.length === 0) return 1;
    
    let maxDepth = 0;
    for (const child of children) {
        const childDepth = calculateDepth(edges.filter(edge => edge.parent !== root), child);
        maxDepth = Math.max(maxDepth, childDepth);
    }
    
    return maxDepth + 1;
}

// Helper function to detect cycle using DFS
function hasCycle(edges, startNode) {
    const visited = new Set();
    const recursionStack = new Set();
    
    function dfs(node) {
        visited.add(node);
        recursionStack.add(node);
        
        const children = edges.filter(edge => edge.parent === node).map(edge => edge.child);
        
        for (const child of children) {
            if (!visited.has(child)) {
                if (dfs(child)) return true;
            } else if (recursionStack.has(child)) {
                return true;
            }
        }
        
        recursionStack.delete(node);
        return false;
    }
    
    return dfs(startNode);
}

// Helper function to find all nodes in a group
function findGroupNodes(edges, startNode) {
    const nodes = new Set();
    const queue = [startNode];
    
    while (queue.length > 0) {
        const node = queue.shift();
        if (nodes.has(node)) continue;
        nodes.add(node);
        
        // Find children
        const children = edges.filter(edge => edge.parent === node).map(edge => edge.child);
        children.forEach(child => queue.push(child));
        
        // Find parents
        const parents = edges.filter(edge => edge.child === node).map(edge => edge.parent);
        parents.forEach(parent => queue.push(parent));
    }
    
    return nodes;
}

// Main processing function
function processData(data) {
    const invalidEntries = [];
    const duplicateEdges = [];
    const validEdges = [];
    const edgeSet = new Set();
    
    // Step 1: Validate entries and handle duplicates
    for (const entry of data) {
        if (typeof entry !== 'string') {
            invalidEntries.push(String(entry));
            continue;
        }
        
        const trimmedEntry = entry.trim();
        
        if (!isValidNode(trimmedEntry)) {
            invalidEntries.push(trimmedEntry);
            continue;
        }
        
        // Check for duplicate
        if (edgeSet.has(trimmedEntry)) {
            duplicateEdges.push(trimmedEntry);
        } else {
            edgeSet.add(trimmedEntry);
            const { parent, child } = parseNode(trimmedEntry);
            validEdges.push({ parent, child, original: trimmedEntry });
        }
    }
    
    // Step 2: Handle multi-parent - keep first parent for each child
    const childToParent = new Map();
    const uniqueParentEdges = [];
    
    for (const edge of validEdges) {
        if (!childToParent.has(edge.child)) {
            childToParent.set(edge.child, edge.parent);
            uniqueParentEdges.push(edge);
        }
    }
    
    // Step 3: Find all nodes (roots and children)
    const allParents = new Set(uniqueParentEdges.map(edge => edge.parent));
    const allChildren = new Set(uniqueParentEdges.map(edge => edge.child));
    
    // Find potential roots (nodes that never appear as children)
    let potentialRoots = [...allParents].filter(parent => !allChildren.has(parent));
    
    // If no roots found, use all nodes and find cycles
    const allNodes = new Set([...allParents, ...allChildren]);
    
    // Find connected components
    const visitedNodes = new Set();
    const components = [];
    
    for (const node of allNodes) {
        if (!visitedNodes.has(node)) {
            const groupNodes = findGroupNodes(uniqueParentEdges, node);
            components.push([...groupNodes]);
            groupNodes.forEach(n => visitedNodes.add(n));
        }
    }
    
    // Process each component
    const hierarchies = [];
    let cyclicGroups = 0;
    let validTrees = 0;
    let treeDepths = [];
    
    for (const component of components) {
        const componentEdges = uniqueParentEdges.filter(edge => 
            component.includes(edge.parent) && component.includes(edge.child)
        );
        
        const componentParents = new Set(componentEdges.map(edge => edge.parent));
        const componentChildren = new Set(componentEdges.map(edge => edge.child));
        const rootsInComponent = [...componentParents].filter(p => !componentChildren.has(p));
        
        let root;
        let hasCycleFlag = false;
        
        // Check for cycle
        if (rootsInComponent.length === 0) {
            hasCycleFlag = true;
            cyclicGroups++;
            root = [...component].sort()[0]; // Lexicographically smallest
        } else {
            root = rootsInComponent[0];
        }
        
        // Detect cycle in the component
        const cycleDetected = hasCycle(componentEdges, root);
        
        if (cycleDetected || hasCycleFlag) {
            hierarchies.push({
                root: root,
                tree: {},
                has_cycle: true
            });
        } else {
            validTrees++;
            const tree = buildTree(componentEdges, root);
            const depth = calculateDepth(componentEdges, root);
            treeDepths.push({ root, depth });
            
            hierarchies.push({
                root: root,
                tree: tree,
                depth: depth
            });
        }
    }
    
    // Find largest tree
    let largestTreeRoot = null;
    if (treeDepths.length > 0) {
        const maxDepth = Math.max(...treeDepths.map(t => t.depth));
        const largestTrees = treeDepths.filter(t => t.depth === maxDepth);
        largestTreeRoot = largestTrees.sort((a, b) => a.root.localeCompare(b.root))[0].root;
    }
    
    return {
        hierarchies,
        invalidEntries,
        duplicateEdges,
        summary: {
            total_trees: validTrees,
            total_cycles: cyclicGroups,
            largest_tree_root: largestTreeRoot || ""
        }
    };
}

// POST /bfhl endpoint
app.post('/bfhl', (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                error: "Invalid request body. 'data' array is required."
            });
        }
        
        const result = processData(data);
        
        const response = {
            user_id: USER_ID,
            email_id: EMAIL_ID,
            college_roll_number: COLLEGE_ROLL_NUMBER,
            ...result
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`POST /bfhl endpoint ready`);
    console.log(`CORS enabled for all origins`);
});

module.exports = app;