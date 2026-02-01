---
description: Sync local dev branch with upstream/dev
---

Sync the current dev branch with upstream/dev. This command will:

1. Check that we're on the dev branch
2. Fetch latest changes from upstream
3. Merge upstream/dev into local dev
4. Automatically resolve common conflicts (workflow files deleted in HEAD, import conflicts)
5. Complete the merge

If conflicts cannot be auto-resolved, the merge will be aborted and you'll need to resolve manually.

!`git branch --show-current`

First, check if we're on the dev branch. If not, abort with an error message.

!`git fetch upstream`

Fetch the latest changes from upstream.

!`git log --oneline dev..upstream/dev | wc -l`

Check how many commits upstream is ahead. If 0, report that we're already up to date.

!`git merge upstream/dev --no-edit 2>&1 || echo "MERGE_CONFLICTS_EXIST"`

Attempt to merge. If conflicts occur, the output will contain conflict information.

If merge conflicts exist:

1. Check for modify/delete conflicts on workflow files (deleted in HEAD, modified in upstream):
   !`git diff --name-only --diff-filter=U | grep -E '^\.github/workflows/' || true`

   For each workflow file in conflict, remove it since it was deleted in HEAD:
   !`git diff --name-only --diff-filter=U | grep -E '^\.github/workflows/' | xargs -r git rm -f 2>/dev/null || true`

2. Check for content conflicts in code files:
   !`git diff --name-only --diff-filter=U | grep -vE '^\.github/workflows/' || true`

   For code conflicts, analyze the conflict markers and resolve appropriately:
   - If both sides added different imports: keep both
   - If one side deleted and one modified: prefer the modification
   - Otherwise: report the conflict for manual resolution

3. Stage resolved files and complete merge:
   !`git add -A && git diff --cached --quiet || git commit --no-edit`

After successful merge, check if we should push:

If $1 is "--push":
!`git push origin dev`
Report: "Successfully synced and pushed to origin/dev"
Else:
Report: "Successfully synced with upstream/dev. Run with --push flag to push to origin."

Show a summary of what was merged:
!`git log --oneline --graph -10`
