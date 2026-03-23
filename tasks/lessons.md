# Lessons

## 2026-03-23

- Before telling the user to install or publish an npm package by name, verify whether that package name is already taken on the npm registry. If the name is claimed, do not present `npm install -g <name>` as the repo's public install path without first resolving ownership, using a scoped package, or renaming the package.
