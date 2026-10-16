# Git & GitHub for this project

## The vocabulary

| Word | Plain meaning |
|---|---|
| **Repository (repo)** | The project folder plus its full history. Yours is `mountaindrowner/Rhythm-Game`. |
| **Commit** | A saved snapshot of the files with a message saying what changed. You can always go back to any commit. |
| **Branch** | A separate line of commits, like a parallel version of the project. Changing one branch doesn't touch the others. |
| **Push** | Upload your new commits to GitHub. |
| **Pull** | Download new commits from GitHub. |
| **Pull request (PR)** | A proposal to merge one branch into another. You can review the changes before accepting. |
| **GitHub Actions** | Robots that run on GitHub's computers when you push (ours tests, builds and publishes the game). |
| **GitHub Pages** | Free web hosting for a repo. Our Actions publish the game there. |

## This repo's branches

```text
original ──●  (the handed-over game, frozen)
            \
main         ●────────●──── ...  (the 3D remake; new work goes here)
           import   3D v0.1
```

- **`original`** keeps the game exactly as received. Never change it; it's your reference copy.
- **`main`** is the real project. It starts from the same import, then adds the 3D remake.
- For bigger experiments, make a new branch off `main` (e.g. `new-stage-lights`). If it works, merge it with a pull request; if not, delete it and nothing is lost.

## Common things you'll do

On github.com:

- **See the code:** the Code tab; switch branches with the branch dropdown.
- **See history:** click "commits" to see every snapshot and exactly what changed.
- **Compare branches:** `https://github.com/mountaindrowner/Rhythm-Game/compare/original...main`
- **See test and build results:** the **Actions** tab. A green ✓ means tests passed; a red ✗ means something broke, and you can click it to see what.
- **Download the itch.io ZIP:** Actions → the latest run → "Artifacts" → `rhythm-riot-itch`.

On your own computer (optional):

```bash
git clone https://github.com/mountaindrowner/Rhythm-Game.git
cd Rhythm-Game
git checkout main            # switch to the main branch
npm install && npm run dev   # play it locally

# after editing files:
git add -A
git commit -m "Make the notes faster"
git push
```

## One-time setup: publish the game with GitHub Pages

1. On GitHub open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to **Actions → Build, test and publish → Run workflow** (or just push a change).

Your game will then be live at `https://mountaindrowner.github.io/Rhythm-Game/`. You can open that link on your iPhone to test it.

This is set up. Every push to `main` re-publishes the game there within a few minutes.
