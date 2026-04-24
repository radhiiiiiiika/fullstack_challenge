// API Configuration - UPDATE THIS WITH YOUR BACKEND URL
const API_BASE_URL = 'http://localhost:3000'; // For local testing
// const API_BASE_URL = 'https://your-backend-url.vercel.app'; // For production after deployment
const API_ENDPOINT = `${API_BASE_URL}/bfhl`;

// DOM Elements
const nodeInput = document.getElementById('nodeInput');
const submitBtn = document.getElementById('submitBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const responseSection = document.getElementById('responseSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Summary Elements
const totalTreesEl = document.getElementById('totalTrees');
const totalCyclesEl = document.getElementById('totalCycles');
const largestTreeEl = document.getElementById('largestTree');

// Identity Elements
const userIdEl = document.getElementById('userId');
const emailIdEl = document.getElementById('emailId');
const rollNumberEl = document.getElementById('rollNumber');

// Lists
const hierarchiesContainer = document.getElementById('hierarchiesContainer');
const invalidEntriesEl = document.getElementById('invalidEntries');
const duplicateEdgesEl = document.getElementById('duplicateEdges');

// Helper function to render hierarchies
function renderHierarchies(hierarchies) {
    if (!hierarchies || hierarchies.length === 0) {
        hierarchiesContainer.innerHTML = '<div class="empty-list">No hierarchies found</div>';
        return;
    }
    
    hierarchiesContainer.innerHTML = '';
    
    hierarchies.forEach((hierarchy, index) => {
        const hierarchyDiv = document.createElement('div');
        hierarchyDiv.className = 'hierarchy-item';
        
        const isCycle = hierarchy.has_cycle === true;
        const headerHtml = `
            <div class="hierarchy-header" onclick="toggleHierarchy(${index})">
                <div class="hierarchy-title">
                    <i class="fas ${isCycle ? 'fa-sync-alt' : 'fa-tree'}"></i>
                    <span>Root: <span class="root-node">${hierarchy.root}</span></span>
                </div>
                <div>
                    ${isCycle ? '<span class="badge-cycle"><i class="fas fa-exclamation-triangle"></i> Cycle Detected</span>' : `<span class="badge-depth"><i class="fas fa-chart-line"></i> Depth: ${hierarchy.depth}</span>`}
                    <i class="fas fa-chevron-down" style="margin-left: 12px;"></i>
                </div>
            </div>
            <div class="hierarchy-content" id="hierarchy-content-${index}">
                ${!isCycle ? `<div class="tree-view"><pre>${escapeHtml(JSON.stringify(hierarchy.tree, null, 2))}</pre></div>` : '<div class="tree-view"><p style="color: #ef4444;">Cycle detected - no tree structure available</p></div>'}
            </div>
        `;
        
        hierarchyDiv.innerHTML = headerHtml;
        hierarchiesContainer.appendChild(hierarchyDiv);
    });
}

// Helper function to toggle hierarchy visibility
window.toggleHierarchy = function(index) {
    const content = document.getElementById(`hierarchy-content-${index}`);
    if (content) {
        content.classList.toggle('open');
    }
};

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to render list items
function renderList(container, items, icon = 'fa-times-circle') {
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-list"><i class="fas fa-check-circle"></i> None</div>';
        return;
    }
    
    container.innerHTML = '';
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'entry-item';
        itemDiv.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(item)}</span>`;
        container.appendChild(itemDiv);
    });
}

// Helper function to show error
function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    responseSection.classList.add('hidden');
    loadingIndicator.classList.add('hidden');
    
    setTimeout(() => {
        errorSection.classList.add('hidden');
    }, 5000);
}

// Helper function to show loading
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    responseSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
}

// Helper function to hide loading
function hideLoading() {
    loadingIndicator.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-play"></i> Process Hierarchy';
}

// Helper function to parse input text to array
function parseInputToArray(inputText) {
    return inputText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Main function to call API and render response
async function processHierarchy() {
    const inputText = nodeInput.value.trim();
    
    if (!inputText) {
        showError('Please enter some node relationships');
        return;
    }
    
    const dataArray = parseInputToArray(inputText);
    
    if (dataArray.length === 0) {
        showError('Please enter valid node relationships');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: dataArray }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        totalTreesEl.textContent = result.summary?.total_trees || 0;
        totalCyclesEl.textContent = result.summary?.total_cycles || 0;
        largestTreeEl.textContent = result.summary?.largest_tree_root || '-';
        
        userIdEl.textContent = result.user_id || '-';
        emailIdEl.textContent = result.email_id || '-';
        rollNumberEl.textContent = result.college_roll_number || '-';
        
        renderHierarchies(result.hierarchies);
        renderList(invalidEntriesEl, result.invalid_entries, 'fa-exclamation-triangle');
        renderList(duplicateEdgesEl, result.duplicate_edges, 'fa-copy');
        
        responseSection.classList.remove('hidden');
        errorSection.classList.add('hidden');
        
        responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('API Error:', error);
        showError(`Failed to process request: ${error.message}. Make sure your backend is running at ${API_BASE_URL}`);
    } finally {
        hideLoading();
    }
}

// Event Listeners
submitBtn.addEventListener('click', processHierarchy);

// Allow Ctrl+Enter to submit
nodeInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        processHierarchy();
    }
});

// NO DEFAULT DATA - Empty textarea

console.log('Frontend loaded. API Endpoint:', API_ENDPOINT);