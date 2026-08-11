---
name: hakuhiro-project-style
description: Distill and apply Hakuhiro's established repository writing style to project documentation, GitHub descriptions, commit messages, changelogs, build metadata, and release notes. Use when Codex writes or revises README/progress/technical docs, drafts commits, prepares a version or GitHub Release, describes build artifacts and verified targets, or needs to keep those outputs consistent across Hakuhiro projects.
---

# Hakuhiro Project Style

Apply Hakuhiro's concise, result-first Chinese technical writing style while preserving the current repository's own conventions and verified facts.

## Workflow

1. Inspect repository-local instructions, `README`, progress or handoff documents, package/build metadata, `git status`, and relevant history. Treat repository-local rules as authoritative when they differ from this Skill.
2. Read [references/style-guide.md](references/style-guide.md) before drafting prose, repository descriptions, commit messages, changelogs, build information, or releases.
3. Read [references/templates.md](references/templates.md) when creating a README, commit message, release note, build metadata record, or version proposal. Adapt the smallest relevant template; do not add empty sections.
4. Gather evidence before writing. Inspect the staged diff for a commit message, the tag or commit range for a release, and the actual build outputs for artifact metadata.
5. Draft in concise Chinese unless the repository or user requires another language. Keep commands, paths, identifiers, product names, and established technical terms exact.
6. Validate links and formatting, then run only the checks relevant to the changed surface. State exactly what passed, what was not run, and why.
7. Update the repository's progress or handoff document after a material milestone, decision, blocker, dependency change, or release.

## Evidence Rules

- Never invent versions, compatibility, test results, dates, commit IDs, artifact names, file sizes, or checksums.
- Distinguish `已验证`, `已通过`, `当前`, `计划`, `待验证`, and `未运行`. Do not turn an intention or declared engine range into a verified result.
- Keep recommendations visibly separate from observed project habits. The release and build templates in this Skill are recommended extensions because the sampled repositories do not establish a consistent historical GitHub Release format.
- Prefer a precise limitation over a broad assurance. Record recovery or rollback behavior when a tool modifies user files or persistent data.

## Repository Boundaries

- Preserve working-name and undecided-brand status until the owner explicitly decides a formal name. Do not create a temporary Chinese name or silently promote a candidate to the product name.
- Do not rename repositories, directories, packages, manifests, cache keys, remotes, or legal text based on a candidate name.
- Do not stage, commit, tag, push, publish, upload artifacts, or create a GitHub Release unless the user explicitly requests that action.
- Preserve existing user changes and keep generated claims tied to reproducible commands or source evidence.
