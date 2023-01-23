import {
  addProjectConfiguration,
  getWorkspaceLayout,
  names,
  Tree,
} from '@nrwl/devkit';
import { runCargo } from '../../common';
import { AwsRustLambdaGeneratorSchema } from './schema';

interface NormalizedSchema extends AwsRustLambdaGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  parsedVariables: string[];
}

function normalizeOptions(
  tree: Tree,
  options: AwsRustLambdaGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  const parsedVariables = options.variables ? options.variables.split(',') : [];
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    parsedVariables
  };
}

export default async function (
  tree: Tree,
  options: AwsRustLambdaGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@aidozig/lambda:build',
      },
    },
    tags: normalizedOptions.parsedTags,
  });

  const cargoOptions: string[] = [];

  cargoOptions.push('new');
  
  if(normalizedOptions.template) {
    cargoOptions.push('--template');
    cargoOptions.push(normalizedOptions.template);
  }

  normalizedOptions.parsedVariables.forEach(keyVariable => { 
    cargoOptions.push('--render-var');
    cargoOptions.push(keyVariable);
  })
  
  cargoOptions.push(normalizedOptions.projectName);

  await runCargo(cargoOptions, normalizedOptions.projectRoot);
}
