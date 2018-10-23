import gulp from 'gulp';
import isEmail from 'validator/lib/isEmail';
import isUrl from 'validator/lib/isURL';
import npmValidate from 'validate-npm-package-name';
import inquirer from 'inquirer';
import path from 'path';
import mergeStream from 'merge-stream';

import { args } from './util';
import { parseStylePreprocessorExtension } from './parser';
import {
  assetCopy,
  babelConfigCopy,
  configCopy,
  demoCopy,
  demoHelperScriptCopy,
  getPackageConfig,
  getPackerConfig,
  licenseCopy,
  readmeCopy,
  sourceCopy,
  styleCopy,
  templateCopy
} from './generate-util';

gulp.task('generate', (done) => {
  try {
    const questions = [
      {
        message: 'Give us a small description about the library (optional)?',
        name: 'description',
        type: 'input'
      },
      {
        message: 'Give us a set of comma separated package keywords (optional)?',
        name: 'keywords',
        type: 'input'
      },
      {
        message: 'Author\'s name (optional)?',
        name: 'author',
        type: 'input'
      },
      {
        message: 'Author\'s email address (optional)?',
        name: 'email',
        type: 'input',
        validate: (value) => {
          return !value || isEmail(value) ? true : 'Value must be a valid email address';
        }
      },
      {
        message: 'Author\'s github username (optional)?',
        name: 'githubUsername',
        type: 'input',
        validate: (value) => {
          return true; // todo: add GH username validation here
        }
      },
      {
        message: 'Library homepage link (optional)?',
        name: 'website',
        type: 'input',
        validate: (value) => {
          return !value || isUrl(value) ? true : 'Value must be a valid URL';
        }
      },
      {
        default: true,
        message: 'Do you want to use typescript?',
        name: 'typescript',
        type: 'confirm'
      },
      {
        default: true,
        message: 'Do you want style sheet support?',
        name: 'styleSupport',
        type: 'confirm'
      },
      {
        choices: [
          'scss',
          'sass',
          'less',
          'stylus',
          'none'
        ],
        default: 0,
        message: 'What\'s the style pre processor you want to use?',
        name: 'stylePreprocessor',
        type: 'list',
        when: (answers) => {
          return answers.styleSupport;
        }
      },
      {
        default: false,
        message: 'Do you want to inline bundle styles within script?',
        name: 'bundleStyles',
        type: 'confirm',
        when: (answers) => {
          return answers.styleSupport;
        }
      },
      {
        default: true,
        message: 'Are you building a browser compliant library?',
        name: 'browserCompliant',
        type: 'confirm'
      },
      {
        default: false,
        message: 'Are you building a node CLI project?',
        name: 'cliProject',
        type: 'confirm',
        when: (answers) => {
          return !answers.browserCompliant;
        }
      },
      {
        choices: [
          'umd',
          'amd',
          'iife',
          'system'
        ],
        default: 0,
        message: 'What\'s the build bundle format you want to use?',
        name: 'bundleFormat',
        type: 'list',
        validate: (value) => {
          return !!value || 'Bundle format is required';
        },
        when: (answers) => {
          return answers.browserCompliant;
        }
      },
      {
        message: 'What\'s the AMD id you want to use? (optional)',
        name: 'amdId',
        type: 'input',
        validate: (value) => {
          const matches = value.match(/^(?:[a-z]\d*(?:-[a-z])?)*$/i);
          return value === '' || !!matches || 'AMD id should only contain alphabetic characters, i.e: \'my-bundle\'';
        },
        when: (answers) => {
          return answers.bundleFormat === 'umd' || answers.bundleFormat === 'amd';
        }
      },
      {
        message: 'What\'s the library namespace you want to use?',
        name: 'namespace',
        type: 'input',
        validate: (value) => {
          const matches = value.match(/^(?:[a-z]\d*(?:\.[a-z])?)+$/i);
          return !!matches || 'Namespace should be an object path, i.e: \'ys.nml.lib\'';
        },
        when: (answers) => {
          return answers.bundleFormat === 'umd' || answers.bundleFormat === 'iife' || answers.bundleFormat === 'system';
        }
      },
      {
        choices: [
          'Jasmine',
          'Mocha'
        ],
        default: 0,
        message: 'Which unit test framework do you want to use?',
        name: 'testFramework',
        type: 'list'
      },
      {
        default: (new Date()).getFullYear(),
        message: 'What is the library copyright year (optional)?',
        name: 'year',
        type: 'input'
      },
      {
        choices: [
          'MIT License',
          'Apache 2 License',
          'Mozilla Public License 2.0',
          'BSD 2-Clause (FreeBSD) License',
          'BSD 3-Clause (NewBSD) License',
          'Internet Systems Consortium (ISC) License',
          'GNU LGPL 3.0 License',
          'GNU GPL 3.0 License',
          'Unlicense',
          'No License'
        ],
        default: 0,
        message: 'What\'s the license you want to use?',
        name: 'license',
        type: 'list',
        validate: (value) => {
          return !!value || 'License is required';
        }
      },
      {
        default: false,
        message: 'Do you want to use yarn as package manager?',
        name: 'isYarn',
        type: 'confirm'
      }
    ];

    if (args.length !== 2) {
      console.log('Please provide a library name to generate the project');
      console.log('npx packer-cli generate my-library');
      done();
      return;
    }

    const packageName = args[1];
    const packageNameValidity = npmValidate(packageName);
    if (!packageNameValidity.validForNewPackages) {
      console.log(packageNameValidity.errors.join('\n'));
      done();
      return;
    }

    inquirer.prompt(questions).then((options) => {
      const packerConfig = getPackerConfig(options);
      const packageConfig = getPackageConfig(options, packageName);
      const projectDir = path.join(process.cwd(), packageName);
      const styleExt = parseStylePreprocessorExtension(packerConfig.stylePreprocessor);

      const merged = mergeStream(assetCopy(projectDir), templateCopy(projectDir));

      if (packerConfig.styleSupport) {
        merged.add(styleCopy(styleExt, projectDir));
      }

      if (!packerConfig.cliProject) {
        merged.add(demoCopy(packerConfig, packageName, projectDir));
        merged.add(demoHelperScriptCopy(projectDir));
      }

      merged.add([
        sourceCopy(packerConfig, styleExt, projectDir),
        licenseCopy(packageConfig, projectDir),
        readmeCopy(packageConfig, projectDir),
        babelConfigCopy(packerConfig, projectDir),
        configCopy(packageConfig, packerConfig, projectDir)
      ]);

      merged.on('end', () => {
        done();
      });
    });
  } catch (error) {
    console.log(error);
  }
});