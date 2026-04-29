fetch('https://api.github.com/repos/TheJenilDGohel/synapse/issues?state=all&per_page=100')
  .then(res => res.json())
  .then(issues => {
    const windowsIssues = issues.filter(i => {
       const title = i.title.toLowerCase();
       const body = (i.body || '').toLowerCase();
       const labels = i.labels.map(l => l.name.toLowerCase());
       return title.includes('windows') || body.includes('windows') || labels.some(l => l.includes('windows')) || title.includes('win32');
    });
    console.log('Total issues/PRs checked:', issues.length);
    console.log('Windows issues:', windowsIssues.length);
    windowsIssues.forEach(i => {
       console.log(`#${i.number} [${i.state}] [${i.pull_request ? 'PR' : 'Issue'}]: ${i.title}`);
    });
  })
  .catch(err => console.error(err));
