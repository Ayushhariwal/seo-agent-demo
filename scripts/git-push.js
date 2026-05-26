const { execSync } = require('child_process');

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

async function commitAndPush(message) {
  const branch = process.env.DEPLOY_BRANCH || 'main';
  const date = new Date().toISOString().split('T')[0];
  const commitMsg = message || `SEO auto-update ${date}`;

  run('git config user.email "seo-bot@internal.com"');
  run('git config user.name "SEO Agent Bot"');
  run('git add -A');

  const staged = run('git diff --staged --name-only');
  if (!staged) {
    console.log('Nothing to commit — everything already up to date.');
    return { committed: false };
  }

  console.log('Committing files:');
  staged.split('\n').forEach(f => console.log(`  ${f}`));

  run(`git commit -m "${commitMsg}"`);
  run(`git push origin ${branch}`);
  console.log(`Pushed to ${branch}`);

  return { committed: true, branch, files: staged.split('\n') };
}

module.exports = { commitAndPush };