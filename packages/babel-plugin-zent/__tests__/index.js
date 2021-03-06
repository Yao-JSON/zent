import { transform } from '@babel/core';

import pluginZent from '../src';

function compile(code, options) {
  return transform(code, {
    babelrc: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 6,
          },
          modules: false,
        },
      ],
    ],

    plugins: [
      [
        pluginZent,
        Object.assign(
          { moduleMappingFile: '../../zent/dependency-graph.json' },
          options
        ),
      ],
    ],
  }).code;
}

describe('babel-plugin-zent', () => {
  it('throws on side-effect only import', () => {
    expect(() => compile("import 'zent'")).toThrowError(
      /Side-effect only import is not allowed in zent/
    );
  });

  it('throws on namespace import', () => {
    expect(() => compile("import * as Zent from 'zent'")).toThrowError(
      /Namespace import is not allowed in zent/
    );
  });

  it('throws on default import', () => {
    const defaultImportErrorRegexp = /There is no default export in zent/;
    expect(() => compile("import Zent from 'zent'")).toThrowError(
      defaultImportErrorRegexp
    );
    expect(() => compile("import Zent, { Button } from 'zent'")).toThrowError(
      defaultImportErrorRegexp
    );
  });

  it('throws on require', () => {
    expect(() => compile("require('zent')")).toThrowError(
      /require\('zent'\) is not allowed/
    );
  });

  it('transforms component imports', () => {
    // eslint-disable-next-line
    const rules = require('../../zent/dependency-graph.json');

    Object.keys(rules).forEach(component => {
      const rule = rules[component];
      const src = `import { ${component} } from 'zent'`;
      const compiled = compile(src);

      if (rule.isDefaultExport) {
        expect(
          compiled.indexOf(`import ${component} from \"zent/lib${rule.js}\"`)
        ).not.toBe(-1);
      } else {
        expect(
          compiled.indexOf(
            `import { ${component} } from \"zent/lib${rule.js}\"`
          )
        ).not.toBe(-1);
      }
    });

    // rename imports
    expect(
      compile("import { Button as Foobar } from 'zent'; console.log(Foobar)")
    ).toMatch('console.log(Foobar)');

    // No module named NotExist
    expect(() => compile("import { NotExist } from 'zent';")).toThrow();

    expect(() =>
      compile("import { Affix } from 'zent';", {
        moduleMappingFile: './fakeModuleMapping.json',
        automaticStyleImport: true,
      })
    ).toThrow();
  });

  it('can add css imports', () => {
    expect(
      compile("import { Button } from 'zent'", { automaticStyleImport: true })
    ).toMatch('import "zent/css/button.css"');

    expect(
      compile("import { Portal } from 'zent'", { automaticStyleImport: true })
    ).toMatch('import "zent/css/base.css"');

    const transformedCode = compile("import { Pop, Button } from 'zent'", {
      automaticStyleImport: true,
    });
    expect(transformedCode).toMatch('import "zent/css/button.css"');
    expect(transformedCode).toMatch('import "zent/css/pop.css"');
  });

  it('can add raw style imports', () => {
    expect(
      compile("import { Button } from 'zent'", {
        automaticStyleImport: true,
        useRawStyle: true,
      })
    ).toMatch('import "zent/assets/button.scss"');

    expect(
      compile("import { Portal } from 'zent'", {
        automaticStyleImport: true,
        useRawStyle: true,
      })
    ).toMatch('import "zent/assets/base.scss"');

    const transformedCode = compile("import { Pop, Button } from 'zent'", {
      automaticStyleImport: true,
      useRawStyle: true,
    });
    expect(transformedCode).toMatch('import "zent/assets/button.scss"');
    expect(transformedCode).toMatch('import "zent/assets/pop.scss"');
  });

  it('can disable javascript module rewrite', () => {
    const code = "import { Button, Alert } from 'zent';";
    expect(
      compile(code, {
        noModuleRewrite: true,
      })
    ).toBe(code);

    let transformedCode = compile(code, {
      noModuleRewrite: true,
      automaticStyleImport: true,
    });
    expect(transformedCode).toMatch(code);
    expect(transformedCode).toMatch('import "zent/css/button.css"');
    expect(transformedCode).toMatch('import "zent/css/alert.css"');

    transformedCode = compile(code, {
      noModuleRewrite: true,
      automaticStyleImport: true,
      useRawStyle: true,
    });
    expect(transformedCode).toMatch(code);
    expect(transformedCode).toMatch('import "zent/assets/button.scss"');
    expect(transformedCode).toMatch('import "zent/assets/alert.scss"');
  });
});
