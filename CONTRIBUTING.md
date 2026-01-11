# 贡献指南

感谢您对 Team Works View 项目的关注！我们欢迎所有形式的贡献。

## 项目简介

Team Works View 是一个 Visual Studio Code 扩展，用于可视化查看团队成员在指定日期/周内的 Git 提交情况。它支持按作者分列显示、统计文件修改数量和代码行数变化，帮助团队更好地了解工作进展。

## 开发环境设置

### 前置要求

- [Node.js](https://node.js.org/) (推荐使用 LTS 版本)
- [pnpm](https://pnpm.io/) (包管理器)
- [Visual Studio Code](https://code.visualstudio.com/) (最低版本 1.60.0)
- [Git](https://git-scm.com/)

### 安装步骤

1. **Fork 并克隆仓库**

2. **安装依赖**

```bash
pnpm install
```

3. **编译项目**

```bash
pnpm run compile
```

4. **在 VS Code 中打开项目**

```bash
code .
```

5. **启动调试**

- 按 `F5` 键启动扩展开发宿主窗口
- 在新窗口中测试扩展功能

## 开发工作流

### 监听模式

在开发过程中，可以使用监听模式自动编译 TypeScript：

```bash
pnpm run watch
```

### 代码检查

运行 ESLint 检查代码规范：

```bash
pnpm run lint
```

### 运行测试

运行测试套件：

```bash
pnpm run test
```

## 打包扩展

### 安装打包工具

首先需要全局安装 `vsce` (Visual Studio Code Extensions)：

```bash
npm install -g @vscode/vsce
```

或者使用 pnpm：

```bash
pnpm add -g @vscode/vsce
```

### 打包命令

打包扩展为 `.vsix` 文件：

```bash
vsce package
```

打包后的文件将生成在项目根目录，文件名格式为：`team-works-view-0.0.1.vsix`

### 其他打包选项

- **打包并指定输出文件名**：
  ```bash
  vsce package -o my-extension.vsix
  ```

- **打包并跳过依赖检查**：
  ```bash
  vsce package --no-dependencies
  ```

- **打包并包含 yarn 锁文件**：
  ```bash
  vsce package --yarn
  ```

### 安装打包的扩展

打包完成后，可以在 VS Code 中安装 `.vsix` 文件：

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS)
3. 输入 "Extensions: Install from VSIX..."
4. 选择生成的 `.vsix` 文件

## 代码规范

### TypeScript 规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置的代码规范
- 使用有意义的变量和函数名
- 添加必要的注释和文档

### 提交信息规范

提交信息应该清晰描述所做的更改：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加或修改测试
chore: 构建过程或辅助工具的变动
```

## 项目结构

```
team-works-view/
├── src/                    # 源代码目录
│   ├── extension.ts        # 扩展入口文件
│   ├── gitService.ts       # Git 服务
│   ├── teamPanelProvider.ts # 侧边栏面板提供者
│   └── teamStatusWebviewProvider.ts # Webview 提供者
├── resources/              # 资源文件
│   └── team-icon.svg       # 团队图标
├── out/                    # 编译输出目录
├── package.json            # 扩展清单文件
├── tsconfig.json           # TypeScript 配置
├── eslint.config.mjs       # ESLint 配置
└── README.md               # 项目说明文档
```

## 贡献流程

1. **创建分支**

   从 `main` 分支创建一个新的功能分支：

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **进行更改**

   在您的分支上进行代码更改，确保：
   - 代码通过 ESLint 检查
   - 添加必要的测试
   - 更新相关文档

3. **提交更改**

   ```bash
   git add .
   git commit -m "feat: 描述您的更改"
   ```

4. **推送分支**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**

   在 GitHub 上创建 Pull Request，详细描述您的更改。

## 报告问题

如果发现 bug 或有功能建议，请在 GitHub Issues 中创建 issue，包含：

- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（VS Code 版本、操作系统等）

## 许可证

本项目采用 [MIT License](LICENSE) 许可证。贡献的代码也将遵循相同的许可证。

## 联系方式

如有任何问题，请通过以下方式联系：

- 创建 GitHub Issue
- 发送 Pull Request

再次感谢您的贡献！🎉

