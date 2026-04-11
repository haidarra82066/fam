let treeData = [];
let auth = null;

async function ensureSession() {
    if (auth && auth.username && auth.sessionToken) {
        return auth;
    }

    const username = prompt("Benutzername eingeben:");
    if (!username) return null;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });

    if (!response.ok) {
        alert('Login fehlgeschlagen.');
        return null;
    }

    const loginData = await response.json();
    auth = {
        username: loginData.username,
        sessionToken: loginData.sessionToken
    };
    return auth;
}

async function saveTree() {
    const session = await ensureSession();
    if (!session) return;

    const response = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: session.username,
            sessionToken: session.sessionToken,
            tree: treeData
        })
    });

    if (response.ok) {
        alert('Family Tree saved!');
    } else {
        alert('Speichern fehlgeschlagen.');
    }
}

document.getElementById('addPerson').addEventListener('click', () => {
    const name = prompt("Name:");
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
