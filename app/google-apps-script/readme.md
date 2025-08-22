# Google Apps & TypeScript Project Template

This repository provides a simple template to start a new
[Google Apps Script](https://developers.google.com/apps-script) project with TypeScript. Building,
linting, formatting, and pushing to Google Apps are all built in.

The project is set up with a TypeScript configuration that transforms your TypeScript files in the
`src` directory into JavaScript files in the `build` directory. It's not enough to upload those
files as-is to Google Apps, however, because Apps Script doesn't support installing and running
dependencies, and uploaded files are run in random order - they aren't linked together at all. To
solve this problem, a second build step uses Webpack to combine all files and depdendencies into a
single minified `Code.js` file, which is the only file that is actually pushed to Google Apps.

## Getting Started

1. Click ["Use This Template"](https://github.com/iansan5653/gas-ts-template/generate) to start a
   new repository. Clone your new repo and open a terminal in the local directory. This template
   includes some configuration for VSCode, but you can use any editor.
2. Ensure [Node.js](https://nodejs.org/en/) is installed on your system, then install all of the
   dependencies by running `npm install`. Alternatively, start a Codespace in your new repository
   and dependencies will be installed automatically.
3. Start a new Google Apps Script project by going to https://script.google.com/home and clicking
   **New project**. You can also start a project tied directly to a specific Google Apps file by
   opening the file and clicking **Tools** -> **Script Editor**.
4. Click the gear icon in the Google Apps Script editor sidebar. Copy the **Script ID**.
5. Replace `SCRIPT_ID` in [`.clasp.json`](./.clasp.json) with your project's ID. This ID is _not_ a
   secret - you can safely commit it to your repository.
6. Write your TypeScript code in the `src` folder. Note that `index.ts` is the entrypoint for your
   project. Only what is imported into the `index.ts` file will be compiled into the script.
7. Optional: lint your code with `npm run lint` and/or auto-format your code with `npm run format`.
   Typically you will want to install the ESLint and/or Prettier extensions in your preferred code
   editor.
8. Deploy your code to Google Apps:
   - **Manually**:
     1. Log in to Google Apps Script by running `npm run login`. Make sure to use the same account
        you used to make the Google Apps Script project. You only need to do this once.
     2. Compile the TypeScript files into a single JavaScript file and push it to Google Apps by
        running `npm run deploy`. Run this every time you make changes.
   - **Automatically**: You can configure GitHub Actions to automatically deploy your code every
     time you push it (or every time you create a new release). This is advantageous because you can
     be sure your repository will always have the same code that is deployed to Google Apps.
     However, Google's Clasp tool is not designed to authenticate in CI environments and so this
     takes some more complicated setup and isn't included in this template by default. One option
     for this might be
     [`ericanastas/deploy-google-app-script-action`](https://github.com/ericanastas/deploy-google-app-script-action).

## Available Scripts

You can run the following scripts by opening the project directory in your terminal (as long as you
have Node & npm installed):

- `npm install` Install all required dependencies.
- `npm run build` Build your project to ensure it compiles properly.
- `npm run format` Format your code automatically using Prettier.
- `npm run lint` Check your code for common errors using ESLint.
- `npm run login` Login to the Google Apps Script client so you can push/pull. You will need to run
  this once on each device you use.
- `npm run pull` Fetch the latest changes from Google Apps Script. You should only need to do this
  if you change the project settings.
- **`npm run push` Build your project and push it to Google Apps in one step.** The first time you
  run this, you will be prompted to log in to your Google account. This command will automatically
  update any test deployments.
- `npm run deploy` Build and push your code, then create a new versioned
  [deployment](https://developers.google.com/apps-script/concepts/deployments).

You can also run any [Clasp command](https://developers.google.com/apps-script/guides/clasp) with
`npx clasp <command>`.

## Automated GitHub Workflow

The template comes with a built-in configuration file for
[GitHub Workflows](https://help.github.com/en/actions/configuring-and-managing-workflows). The
workflow is configured to run on every push to the `main` branch as well as on every Pull Request as
a Check, and it simply checks the code to ensure that it passes linting and is buildable (has no
type/syntax errors). This is known as _continuous integration_ and provides a form of automated
testing to ensure that your project's code is always valid.

For larger projects where more than one developer will be collaborating, it is reccomended to
protect the `main` branch and only allow changes to it through Pull Requests in which all checks
pass. You can learn more about this from GitHub's
[help articles](https://help.github.com/en/github/administering-a-repository/about-protected-branches).

If you would like to disable the workflow, simply delete the
[`checks.yml`](./.github/workflows/checks.yml) file.

## Development Notes

The following notes have important information for writing code for Google Apps Script using this
template. Please read through them before you start.

### **_Important_**: Exposing Functions to Google Apps Script

In order for your Google Apps to run any of your code, you'll need to expose one or more functions
to the engine. In the traditional Google Apps Script environment, you'd do this by declaring global
functions, however in this setup there is no concept of 'global' as all files are modules.

Instead, only functions exported from `index.ts` will be available to Google Apps Script.
Any function exported from `index.ts` will be accessible by all
[triggers](https://developers.google.com/apps-script/guides/triggers) and anywhere else Google Apps
might need to call your function, such as from a
[custom menu](https://developers.google.com/apps-script/guides/menus).

Due to [a bug](https://github.com/iansan5653/gas-ts-template/issues/2) in the Webpack plugin, only exports in `export {...}` form are supported:

```ts
// ❌ Does NOT work
export function bad1() { /* ... */ }

export const bad2 = () => { /* ... */ }

// ✅ Does work:
export {good1} from "./good1.ts"

function good2() { /* ... */ }
const good3 = () => { /* ... */ }

export {good2, good3}
```

Examples for all the simple triggers are given in
[`index.ts`](./src/index.ts).

For cleaner, more usable code, it may be useful to reference functions by their `name` property instead of hardcoding the name into code.
For example:

```ts
const createButton = CardService.newTextButton()
  .setText("Create")
  .setOnClickAction(
     // Here we use `onClickCreateEvent.name` instead of hardcoding `"onClickCreateEvent"`
    CardService.newAction().setFunctionName(onClickCreateEvent.name)
  );
```

### Circular Dependencies

Circular dependencies (files that depend on each other in a circular manner) can cause unexpected
issues like "X is not a function" or "X is not defined". If you are seeing these errors in your
project and you know they are wrong, try checking for circular dependencies using
[`madge`](https://github.com/pahen/madge) (not included in this template):

1. Install `madge` globally with `npm i --global madge`.
2. Check for circular dependencies with `madge src/index.ts --circular`.

## Included Files

- `.github`
  - `workflows` All GitHub workflows are configured using YAML files in this directory.
    - `checks.yml` This is where the continuous integration workflow is configured.
- `src` This is where you'll put all your TypeScript files.
  - `example.ts` Gives an example of how to export something from a local file.
  - `index.ts` Provides you with the five basic triggers prebuilt, as well as an example of how to
    import from a local file.
- `.clasp.json` Provides the configuration for Clasp, the command-line tool which pushes code to
  Google Apps Script.
- `.claspignore` Tells Clasp to ignore every file except for `Code.js`, `appsscript.json`, and
  `readme_appsscript.md`.
- `.gitignore` Tells Git to ignore output files and `node_modules`.
- `.prettierrc` Configures Prettier, the code formatter.
- `appsscript.json` Controls the project setup and Apps Script environment. You can change the
  exception logger, but don't change the runtime version.
- `package.json` Lists the project dependencies and scripts.
- `readme_appsscript.md` If anyone opens your project in the Apps Script editor, they'll just see a
  jumbled file. This note helps them realize that the project should be edited outside of that
  environment.
- `readme.md` This file.
- `tsconfig.json` Configures the TypeScript compiler to enable strict mode and compile to CommonJS
  modules from the `src` folder to the `build` folder.
- `webpack.config.js` Configures Webpack to take files from the `build` folder and dependencies and
  merge them all into a single `Code.js` file.
