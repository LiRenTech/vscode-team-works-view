# 团队工作视图 (Team Works View)

一个 Visual Studio Code 扩展，用于可视化查看团队成员在指定日期/周内的 Git 提交情况。

## 功能特性

- 📊 **天视图和周视图**：支持按天或按周查看团队提交情况
- 👥 **按作者分列显示**：每个团队成员一列，清晰展示各自的工作
- 📈 **统计信息**：显示文件修改数量和代码行数变化（+/-）
- 🎨 **颜色分类**：根据提交类型（feat、fix、refactor、docs、style 等）显示不同颜色
- 🔍 **过滤功能**：支持隐藏 Merge 提交，专注于实际代码变更
- ⏰ **时间线视图**：按提交时间顺序展示，方便了解工作节奏

## 使用方法

1. 在左侧活动栏点击团队图标
2. 在侧边栏面板中选择：
   - **查看团队工作情况（天视图）**：查看指定日期的提交情况
   - **查看团队工作情况（周视图）**：查看指定周的提交情况
3. 使用页面顶部的左右箭头切换日期/周
4. 勾选"隐藏 Merge 提交"可以过滤合并提交

## 提交类型颜色

- 🔵 **蓝色**：feat 开头的功能提交
- 🔴 **红色**：fix 开头的修复提交
- 🟡 **黄色**：refactor 开头的重构提交
- 🟢 **绿色**：docs 开头的文档提交
- 🩷 **粉色**：style 开头的样式提交
- ⚫ **深灰色**：Merge 开头的合并提交
- ⚪ **灰色**：其他类型的提交

## 统计信息

每列顶部显示：
- **文件数量**：该时间段内修改的文件总数
- **代码行数**：绿色显示添加的行数（+），红色显示删除的行数（-）

## 系统要求

- Visual Studio Code 版本：1.60.0 或更高
- 需要在 Git 仓库中工作

## 安装

### 从 VSIX 安装

1. 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS)
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的 `.vsix` 文件

### 从源码构建

参见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细的开发指南。

## 开发

```bash
# 安装依赖
pnpm install

# 编译
pnpm run compile

# 监听模式
pnpm run watch

# 代码检查
pnpm run lint

# 运行测试
pnpm run test
```

## 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与项目。

## 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 作者

LiRenTech

## 反馈

如有问题或建议，请在 GitHub Issues 中提交。
