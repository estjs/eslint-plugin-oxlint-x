# eslint-plugin-oxlint-x

[English](README.md) | [中文](README_zh-CN.md)

---

将 [Oxlint](https://oxc-project.github.io/docs/guide/usage/linter.html) 作为 ESLint 规则运行。这允许你将 Oxlint 的快速 Lint 能力直接集成到 ESLint 工作流中，并支持 `eslint --fix`。

### 特性

- **集成**: 作为标准的 ESLint 规则运行 `oxlint`。
- **自动修复**: 支持 `eslint --fix`，可自动应用 Oxlint 的修复。
- **配置**: 支持 `.oxlintrc.json` 配置文件以及 ESLint 规则选项。
- **高性能**: 利用 Oxlint 的速度处理繁重的 Lint 任务。

### 安装

```bash
npm install eslint-plugin-oxlint-x oxlint -D
# 或
pnpm add eslint-plugin-oxlint-x oxlint -D
# 或
yarn add eslint-plugin-oxlint-x oxlint -D
```

### 使用方法

#### Flat Config (ESLint v9+)

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint-x';

export default [
  {
    plugins: {
      'oxlint-x': oxlintPlugin,
    },
    rules: {
      // 优先级比自动读取 .oxlintrc.json 高，可以覆盖 .oxlintrc.json 的配置
      'oxlint-x/oxlint':['error',{
        // oxlint config
      }], 
    },
  },
];
```

#### 自动读取配置

```json
{
  "plugins": ["oxlint-x"],
  "rules": {
    // 自动读取使用 .oxlintrc.json 配置
    "oxlint-x/oxlint": "warn"
  }
}
```


