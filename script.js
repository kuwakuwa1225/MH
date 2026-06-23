let attributes = [], maxCount = 0, currentAttrIndex = 0, currentCount = 1;
let savedData = JSON.parse(localStorage.getItem('mh-data')) || {};

function initTool() {
    attributes = document.getElementById('attr-input').value.split(',').map(s => s.trim());
    maxCount = parseInt(document.getElementById('count-input').value);
    document.getElementById('setup-area').style.display = 'none';
    document.getElementById('main-area').style.display = 'block';
    renderSurvey();
}

function showMode(mode) {
    document.getElementById('survey-area').style.display = mode === 'survey' ? 'block' : 'none';
    document.getElementById('list-area').style.display = mode === 'list' ? 'block' : 'none';
    if (mode === 'list') renderList();
    if (mode === 'survey') renderSurvey();
}

function renderSurvey() {
    const attr = attributes[currentAttrIndex];
    document.getElementById('current-attr-display').textContent = `調査中: ${attr}属性`;
    const body = document.getElementById('survey-body');
    body.innerHTML = '';
    for (let i = 1; i <= maxCount; i++) {
        let tr = document.createElement('tr');
        if (i === currentCount) tr.className = 'active-row';
        tr.innerHTML = `<td>${i}</td><td><input type="text" value="${savedData[`${attr}-${i}`] || ""}" oninput="saveData('${attr}', ${i}, this.value)"></td>`;
        body.appendChild(tr);
    }
}

function renderList() {
    const header = document.getElementById('table-header');
    const body = document.getElementById('table-body');
    header.innerHTML = '<th>回数</th>' + attributes.map(a => `<th>${a}</th>`).join('');
    body.innerHTML = '';
    
    for (let i = 1; i <= maxCount; i++) {
        let row = document.createElement('tr');
        if (i === currentCount) row.className = 'list-active-row';
        
        let hasData = attributes.some(a => savedData[`${a}-${i}`] && savedData[`${a}-${i}`].trim() !== "");
        if (hasData) row.classList.add('has-data');

        row.innerHTML = `<td>${i}</td>` + attributes.map(a => 
            `<td><input type="text" value="${savedData[`${a}-${i}`] || ""}" oninput="saveData('${a}', ${i}, this.value)"></td>`
        ).join('');
        body.appendChild(row);
    }
}

function saveData(attr, i, val) {
    savedData[`${attr}-${i}`] = val;
    localStorage.setItem('mh-data', JSON.stringify(savedData));
}

function nextStep() {
    if (currentCount < maxCount) {
        currentCount++;
        if (document.getElementById('survey-area').style.display === 'block') {
            renderSurvey();
        } else {
            renderList();
        }
    }
}

function switchAttr() {
    if (currentAttrIndex < attributes.length - 1) {
        currentAttrIndex++; 
        currentCount = 1;
        renderSurvey();
    } else { alert("全属性完了です！"); }
}
