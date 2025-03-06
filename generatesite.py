import json
import os
import urllib.request

REPO_FILE = "repos.json"
LANGUAGE_DIR = "languages"
BASE_URL = "https://api.github.com/users/endj/repos?per_page=100"


def fetch_url(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())


def file_exists(file_path):
    return os.path.exists(file_path)


def fetch_repos():
    if file_exists(REPO_FILE):
        print("Repos already fetched, skipping..")
        return

    json_data = fetch_url(BASE_URL)
    with open(REPO_FILE, "w") as f:
        json.dump(json_data, f, indent=2)

    return json_data


def fetch_language(repo_name):
    try:
        url = f"https://api.github.com/repos/endj/{repo_name}/languages"
        json_data = fetch_url(url)

        os.makedirs(LANGUAGE_DIR, exist_ok=True)
        file_path = os.path.join(LANGUAGE_DIR, repo_name)

        with open(file_path, "w") as f:
            json.dump(json_data, f, indent=2)

        print(f"File written successfully: {file_path}")
    except Exception as e:
        print(f"Error fetching languages for {repo_name}: {e}")


def fetch_languages():
    repos = repo_data()
    repo_map = {}

    for repo in repos:
        file_path = os.path.join(LANGUAGE_DIR, repo["name"])

        if not file_exists(file_path):
            print(f"{repo['name']} does not exist.. fetching")
            fetch_language(repo["name"])

        with open(file_path, "r") as f:
            repo_map[repo["name"]] = json.load(f)

    return repo_map


def repo_data():
    with open(REPO_FILE, "r") as f:
        json_data = json.load(f)

    return [
        {
            "name": r["name"],
            "description": r["description"],
            "url": r["html_url"],
            "language": r["language"],
            "topics": r.get("topics", []),
            "updatedAt": r["updated_at"],
        }
        for r in json_data
    ]


def site_template(body):
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="description" content="Personal Website for Edin Jakupovic.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edin Jakupovic</title>
    <style>
        :root {{
         --dark: rgb(29, 29, 29);
         --dark-hover: #292929;
         --light: #dbdbdb;
         --light-hover: #efefef;
        }}
       
        * {{
            padding: 0;
            border: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            text-decoration: none;
            list-style: none;
        }}
        
        body {{
            margin: 5%;
        }}
        .row {{
            display: flex;
            justify-content: space-between;
        }}
        
        @media (prefers-color-scheme: dark) {{
            * {{
                background: var(--dark);
                color: var(--light);
            }}
       
            li:hover {{
                background: var(--dark-hover);
            }}

            li:hover > * {{
                background: inherit;
            }}
        }}

        @media (prefers-color-scheme: light) {{
            * {{
                background: var(--light);
                color: var(--dark);
            }}
        
            li:hover {{
                background: var(--light-hover);
            }}
           
             li:hover > * {{
               background: inherit;
            }}
        }}
        li {{padding:5px;}}
        

    </style>
</head>
<body>
    {body}
</body>
</html>
"""


def generate_site():
    fetch_repos()
    repo_map = fetch_languages()
    repos = repo_data()

    items = "\n".join(
        f"""
        <li>
            <a href="{res['url']}" target="_blank" rel="noopener">
                <div class="row">
                    <div>
                        <b>{res['name']}</b>
                        <span> - {res['description'] or ''}</span>
                    </div>
                    <div>
                        <span>{', '.join(repo_map.get(res['name'], {}).keys())}</span>
                    </div>
                </div>
            </a>
        </li>
        """
        for res in sorted(repos, key=lambda x: x["updatedAt"], reverse=True)
    )

    return f"""
    <h1>This is my website.</h1>
    <h1>Here are some projects.</h1>
    <ul>
    {items}
    </ul>
    """


if __name__ == "__main__":
    site_content = generate_site()
    with open("index.html", "w") as f:
        f.write(site_template(site_content))
    print("Website generated successfully.")
