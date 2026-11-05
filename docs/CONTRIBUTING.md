# How we work

## Golden rules
1. **Never commit `.env`.** Passwords and keys stay on your own laptop.
2. **Never push straight to `main`.** Work on a branch, then open a pull request.
3. **Pull before you start.** Run `git pull` on `main` every time you sit down to code.

## Daily workflow

```bash
# 1. Get the latest code
git checkout main
git pull

# 2. Make a branch for your Jira story
git checkout -b feature/HAWK-12-upvote-photo

# 3. Code, then save your work
git add .
git commit -m "HAWK-12 Add upvote button to dish page"

# 4. Push your branch
git push -u origin feature/HAWK-12-upvote-photo
```

5. On GitHub, click **Compare & pull request**, ask one teammate to review, then **Merge**.
6. In Jira, move the story to **Done**.

## Branch names
- `feature/<jira-key>-short-name` – new features
- `fix/<jira-key>-short-name` – bug fixes

Use the Jira key (e.g. `HAWK-12`) in branch names and commit messages so Jira links them automatically.

## If you get a merge conflict
1. Run `git pull origin main` on your branch.
2. Open the files VS Code marks as conflicted and choose which lines to keep.
3. `git add .` → `git commit` → `git push`.
4. Stuck? Ask in the group chat before deleting anything.
