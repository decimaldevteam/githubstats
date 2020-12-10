if(location.protocol == 'http:') location.href = location.href.replace('http', 'https');

const queries = new URLSearchParams(location.search);
const user = queries.get('user');

if(!user){
    window.addEventListener('load', () => {
        const app = document.getElementById('app');
        app.innerHTML = `
        <div class="title-box">
            <h1 class="title">GitHub Stats</h1>
            <input id="user-input">
            <p>Press enter if done</p>
        </div>
        `;

        let userInput = document.getElementById('user-input');

        userInput.addEventListener('keypress', e => {
            if(e.keyCode != 13) return;
            location.href = `${location.origin}?user=${userInput.value}`;
        })
    })
}else{
    let alertError = () => {
        alert('GitHub api failed!');
        location.href = location.origin;
    }

    let invalidUser = false;
    let y = '<strong>•</strong>';

    function makeResults(data){
        const app = document.getElementById('app');
        const login = data.login;
        if(data.message == 'Not Found') invalidUser = true;

        if(invalidUser){
            app.innerHTML = `
            <div class="title-box">
                <h1>404</h1>
                <p>The given user could not be found on the github api!</p>
            </div>
            `;
        }else{
            let isOrg = data.type == 'Organization';

            app.innerHTML = `
            <div class="result-box">
                <div class="center">
                    <img src="${data.avatar_url}">
                    <h1>${data.name || 'No Name'}</h1>
                    <h2 style="font-weight: lighter;">${data.login}</h2>
                    <p>Joined ${moment(data.created_at).fromNow()}</p>
                </div>

                <p class="small-info"><strong>Company:</strong> ${data.company || 'No Company'} ${y} <strong>${data.blog ? `<a href="${data.blog}">Blog</a>` : 'No Blog'}</strong> ${y} <strong>Location:</strong> ${data.location || 'No Location'} ${y} <strong>Email:</strong> ${data.email || 'No mail'} ${y} <strong>Hireable:</strong> ${data.hireable ? 'Yes' : 'No'} ${y} <strong>${data.twitter_username ? `<a href="https://twitter.com/${data.twitter_username}">Twitter</a>` : 'No Twitter'}</strong></p>

                <div class="padding">
                    <div class="info-box">
                        <div class="flex">
                            ${makeCard('Followers', data.followers)}
                            ${makeCard('Following', data.following)}
                            ${makeCard('Repos', data.public_repos)}
                            ${makeCard('Gists', data.public_gists)}
                        </div>
                    </div>
                </div>

                <div class="padding">
                    <div class="info-box" id="further-info">
                        <h1 style="text-align: center; padding-bottom: 10px;">Languages</h1>
                        <div style="text-align: center">
                            <div class="chart-container" style="position: relative;  width: 500px; margin: auto;">
                                <canvas id="lang-chart" height="200px"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="padding">
                    <div class="info-box" id="further-info">
                        <h1 style="text-align: center; padding-bottom: 10px;">Statistics</h1>
                        <div style="text-align: center">
                            <div id="stats"></div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            fetch(`https://api.github.com/users/${user}/repos`)
            .then(res => res.json(), alertError)
            .then(data => {
                window.languages = {};
                window.stars = {};
                window.totalStars = 0;
                let openIssues = 0;
                let colors = [];

                for(let i = 0; i < data.length; i++){
                    let lang = data[i].language;

                    if(lang){
                        languages[lang] = (languages[lang] || 0) + 1;
                    }

                    stars[data[i].full_name] = data[i].stargazers_count;
                    totalStars += data[i].stargazers_count;
                    openIssues += data[i].open_issues;
                }

                Object.keys(window.languages).forEach(x => colors.push(window.langColors[x]));

                let langChart = new Chart(document.getElementById('lang-chart').getContext('2d'), {
                    type: 'polarArea',
                    data: {
                        datasets: [{
                            data: Object.values(languages),
                            backgroundColor: colors
                        }],
                        labels: Object.keys(languages)
                    }
                })

                window.forked = data.map(x => x.fork).filter(Boolean).length;
                let highestLangVal = Object.values(languages).sort((a, b) => b - a)[0];
                let mostUsedLang = Object.keys(languages).find(x => languages[x] == highestLangVal) || 'None';
                let highestRepoVal = Object.values(stars).sort((a, b) => b - a)[0];
                let topRepo = Object.keys(stars).find(x => stars[x] == highestRepoVal) || 'None';
                let totalLangs = Object.keys(languages).length;

                document.getElementById('stats').innerHTML = `
                <strong>Forked:</strong> ${forked} Repos<br/>
                <strong>Total Stars:</strong> ${totalStars} Stars<br/>
                <strong>Languages</strong> ${totalLangs}<br/>
                <strong>Most used language:</strong> ${mostUsedLang}<br/>
                <strong>Commits (2020):</strong> <font id="commits">Loading...</font><br/>
                <strong>Open Issues:</strong> ${openIssues}<br/>
                ${isOrg ? '' :  '<strong>Organizations:</strong> <font id="orgs">Loading...</font><br/>'} ${!isOrg ? '' :  '<strong>Members:</strong> <font id="mems">Loading...</font><br/>'}
                <strong>Top Repo:</strong> ${topRepo} (${stars[topRepo]} stars)
                `

                fetch(`https://api.github.com/search/commits?q=author:${login}`, {
                    headers: {
                        Accept: "application/vnd.github.cloak-preview"
                    }
                })
                .then(res => res.json(), alertError)
                .then(commit => {
                    window.commits = commit.total_count;

                    document.getElementById('commits').innerHTML = commit.total_count;
                }, alertError)

                if(!isOrg){
                    fetch(`https://api.github.com/users/${login}/orgs`)
                    .then(res => res.json(), alertError)
                    .then(org => {
                        document.getElementById('orgs').innerHTML = org.map(x => `<a href="https://github.com/${x.login}">${x.login}</a>`).join(', ') || 'No Organization';
                    }, alertError)
                }

                if(isOrg){
                    fetch(`https://api.github.com/orgs/${login}/members`)
                    .then(res => res.json(), alertError)
                    .then(org => {
                        document.getElementById('mems').innerHTML = org.map(x => `<a href="https://github.com/${x.login}">${x.login}</a>`).join(', ') || 'No Public Members';
                    }, alertError)
                }
            }, alertError)
        }
    }

    fetch(`https://api.github.com/users/${user}`)
    .then(res => res.json(), alertError)
    .then(data => {
        try{
            makeResults(data);
        }catch(e){
            window.addEventListener('load', () => makeResults(data));
        }
    }, alertError)
}

function makeCard(name, value){
    return `
    <div class="flex-card">
        <h2>${name}</h2>
        <h3>${value}</h3>
    </div>
    `
}
