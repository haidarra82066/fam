document.getElementById('addPerson').addEventListener('click', () => {
    const name = prompt("Name der Person:");
    if (name) {
        const tree = document.getElementById('tree');
        const person = document.createElement('div');
        person.textContent = name;
        person.className = 'person';
        tree.appendChild(person);
    }
});

let treeData = [];

function saveTree() {
    const username = prompt("Benutzername eingeben:");
    if (!username) return;
    fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, tree: treeData })
    }).then(response => {
        if (response.ok) alert('Familienbaum gespeichert!');
    });
}

document.getElementById('addPerson').addEventListener('click', () => {
    const name = prompt("Name der Person:");
    if (name) {
        treeData.push({ name });
        const tree = document.getElementById('tree');
        const person = document.createElement('div');
        person.textContent = name;
        person.className = 'person';
        tree.appendChild(person);
        saveTree();
    }
});
