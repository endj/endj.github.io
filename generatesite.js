const fs = require('fs').promises;
const path = require('path');
const repoFile = "repos.json"


// Fetches and stores all repos in repos.json file
const fetchRepos = async () => {
    if (await fileExists(repoFile)) {
        console.log("Repos already fetched, skipping..")
        return
    }
    const response = await fetch('https://api.github.com/users/endj/repos?per_page=100');
    const json = await response.json();
    const data = JSON.stringify(json, null, 2);
    await fs.writeFile(repoFile, data);
    return data;
}

// Given a repo, return etails about the repo and writes to languages/repoName
const fetchLanguage = async (repoName) => {
    try {
        const response = await fetch(`https://api.github.com/repos/endj/${repoName}/languages`);
        if (!response.ok) {
            throw new Error(`Failed to fetch languages: ${response.statusText}`);
        }
        const json = await response.json();
        const dir = 'languages';
        const filePath = path.join(dir, repoName);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(json, null, 2));
        console.log(`File written successfully: ${filePath}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw new Error(`Failed to fetch language for repo ${repoName}`);
    }
};

const fetchLanguages = async () => {
    const languages = await repoData()
    for (const repo of languages) {
        const file = await fileExists(`languages/${repo.name}`)
        if (!file) {
            console.log(repo.name, " does not exist.. fetching ")
            await fetchLanguage(repo.name)
        }
    }
    const byName = new Map()
    for (const repo of languages) {
        const data = await fs.readFile(`languages/${repo.name}`)
        const json = JSON.parse(data)
        byName.set(repo.name, json)
    }

    return byName
}


async function fileExists(filePath) {
    try {
        await fs.stat(filePath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('File does not exist.', filePath);
            return false;
        }
        throw error;
    }
}

const siteTemplate = body => {
    const result = `
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="preconnect" href="https://api.github.com">
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
:root {
  --dark: rgb(29, 29, 29);
  --dark-hover: #292929; 
  --light: #dbdbdb;
  --light-hover: #efefef;
}

.row {
  display: flex;
  justify-content: space-between;
}

.row > div:nth-of-type(2) {
    text-align: right;
}

@media (prefers-color-scheme: dark) {
  * {
    background: var(--dark);
    color: var(--light);
  }

  li:hover {
    background: var(--dark-hover);
  }

  li:hover>* {
    background: inherit;
  }
}

/*for light theme*/
@media (prefers-color-scheme: light) {
  * {
    background: var(--light);
    color: var(--dark);
  }

  li:hover {
    background: var(--light-hover);
  }

  li:hover>* {
    background: inherit;
  }
}

body {
  margin: 5%;
}

li {
  display: block;
  padding: 5px;
}


h1 {
  margin: 0;
}

h1:last-of-type {
  margin-bottom: 40px;
}

* {
  padding: 0;
  border: none;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  text-decoration: none;
}

    </style>
</head>
<body>
    ${body}
</body>
</html>
`
    return result;
};

const repoData = async () => {
    const data = await fs.readFile(repoFile)
    const json = JSON.parse(data)
    return json.map(r => {
        const result = {
            name: r.name,
            description: r.description,
            url: r.html_url,
            language: r.language,
            topics: r.topics,
            updatedAt: r.updated_at
        };
        return result;
    })
}

const generateSite = async () => {
    const repos = await fetchRepos()
    const repoMap = await fetchLanguages()
    const data = await repoData()

    const items = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .map(res => {
            return `
        <li>
            <a href=${res.url} target="_blank" rel="noopener">
                <div class="row">
                    <div>
                        <b>${res.name}</b>
                        <span> - ${res.description ?? ''}</span>
                    </div>
                    <div>
                        <span>${Object.keys(repoMap.get(res.name)).join(", ")}</span>
                    </div>
                </div>
            </a>
        </li>
        `
        }).join("")

    return `
    <h1>This is my website.</h1><h1>Here are some repositories.</h1>
    <ul>
    ${items}
    </ul>
    `
}
generateSite().then(site => {
        const siteData = siteTemplate(site)
        fs.writeFile("index.html", siteData);
        console.log(site)
    })