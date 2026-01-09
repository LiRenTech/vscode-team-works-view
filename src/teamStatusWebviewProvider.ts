import * as vscode from 'vscode';
import * as path from 'path';

export class TeamStatusWebviewProvider {
	private static currentPanel: vscode.WebviewPanel | undefined = undefined;

	public static createOrShow(context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// 如果已经存在面板，则显示它
		if (TeamStatusWebviewProvider.currentPanel) {
			TeamStatusWebviewProvider.currentPanel.reveal(column);
			return;
		}

		// 创建新的 webview 面板
		const panel = vscode.window.createWebviewPanel(
			'teamStatusView',
			'今日团队情况',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
			}
		);

		panel.webview.html = TeamStatusWebviewProvider.getWebviewContent(context, panel.webview);

		// 当面板被关闭时，清理引用
		panel.onDidDispose(
			() => {
				TeamStatusWebviewProvider.currentPanel = undefined;
			},
			null,
			context.subscriptions
		);

		TeamStatusWebviewProvider.currentPanel = panel;
	}

	private static getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>今日团队情况</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 30px;
        }
        .placeholder {
            text-align: center;
            padding: 100px 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>今日团队情况</h1>
        <div class="placeholder">
            <p>这里将显示团队今日的工作情况</p>
            <p>具体内容待后续实现...</p>
        </div>
    </div>
</body>
</html>`;
	}
}

