#!/usr/bin/env node

const { program } = require('commander');
const { detectUnused } = require('../dist/index');

program
  .name('vue-unused')
  .description('Dead Code and Dead Export Detector for Vue3')
  .version('1.0.0')
  .option('-p, --path <path>', 'path to Vue project', '.')
  .action((options) => {
    detectUnused(options.path);
  });

program.parse();