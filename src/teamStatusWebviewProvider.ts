import * as vscode from 'vscode';
import * as path from 'path';
import { GitService, GitCommit } from './gitService';

export class TeamStatusWebviewProvider {
	private static currentPanel: vscode.WebviewPanel | undefined = undefined;
	private static currentDate: Date = new Date();
	private static gitService: GitService | undefined = undefined;

	public static createOrShow(context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// 如果已经存在面板，则显示它
		if (TeamStatusWebviewProvider.currentPanel) {
			TeamStatusWebviewProvider.currentPanel.reveal(column);
			return;
		}

		// 初始化 git service
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			TeamStatusWebviewProvider.gitService = new GitService(workspaceFolders[0].uri.fsPath);
		}

		// 创建新的 webview 面板
		const panel = vscode.window.createWebviewPanel(
			'teamStatusView',
			'团队工作情况',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
			}
		);

		// 加载初始数据
		TeamStatusWebviewProvider.updateWebviewContent(panel, context, TeamStatusWebviewProvider.currentDate);

		// 处理来自 webview 的消息
		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'changeDate':
						const newDate = new Date(message.date);
						TeamStatusWebviewProvider.currentDate = newDate;
						await TeamStatusWebviewProvider.updateWebviewContent(panel, context, newDate);
						return;
				}
			},
			null,
			context.subscriptions
		);

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

	private static async updateWebviewContent(
		panel: vscode.WebviewPanel,
		context: vscode.ExtensionContext,
		date: Date
	) {
		// 获取提交数据
		let commits: GitCommit[] = [];
		if (TeamStatusWebviewProvider.gitService) {
			commits = await TeamStatusWebviewProvider.gitService.getCommitsByDate(date);
		}

		// 按作者分组
		const authorsMap = new Map<string, GitCommit[]>();
		for (const commit of commits) {
			if (!authorsMap.has(commit.author)) {
				authorsMap.set(commit.author, []);
			}
			authorsMap.get(commit.author)!.push(commit);
		}

		// 格式化日期显示
		const dateStr = date.toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long'
		});

		panel.webview.html = TeamStatusWebviewProvider.getWebviewContent(
			context,
			panel.webview,
			date,
			dateStr,
			Array.from(authorsMap.entries()),
			commits
		);
	}

	/**
	 * 根据 commit 标题返回对应的颜色类名
	 */
	private static getCommitColorClass(title: string): string {
		const lowerTitle = title.toLowerCase().trim();
		if (lowerTitle.startsWith('merge ')) {
			return 'commit-merge';
		} else if (lowerTitle.startsWith('fix')) {
			return 'commit-fix';
		} else if (lowerTitle.startsWith('feature')) {
			return 'commit-feature';
		} else if (lowerTitle.startsWith('refactor')) {
			return 'commit-refactor';
		} else if (lowerTitle.startsWith('docs')) {
			return 'commit-docs';
		} else {
			return 'commit-default';
		}
	}

	private static getWebviewContent(
		context: vscode.ExtensionContext,
		webview: vscode.Webview,
		currentDate: Date,
		dateStr: string,
		authorsData: [string, GitCommit[]][],
		allCommits: GitCommit[]
	): string {
		const authorCount = authorsData.length;

		// 计算前一天和后一天
		const prevDate = new Date(currentDate);
		prevDate.setDate(prevDate.getDate() - 1);
		const nextDate = new Date(currentDate);
		nextDate.setDate(nextDate.getDate() + 1);

		// 生成时间线 HTML - 按顺序排列，不按时间定位
		const timelineHtml = authorsData.map(([author, commits]) => {
			const commitBlocks = commits.map(commit => {
				const timeStr = commit.authorDate.toLocaleTimeString('zh-CN', {
					hour: '2-digit',
					minute: '2-digit'
				});
				const colorClass = this.getCommitColorClass(commit.title);

				return `
					<div class="commit-block ${colorClass}" title="${commit.title} - ${timeStr}">
						<div class="commit-title">${this.escapeHtml(commit.title)}</div>
						<div class="commit-time">${timeStr}</div>
					</div>
				`;
			}).join('');

			return `
				<div class="author-column">
					<div class="author-header">${this.escapeHtml(author)}</div>
					<div class="commits-container">
						${commitBlocks || '<div class="no-commits">暂无提交</div>'}
					</div>
				</div>
			`;
		}).join('');

		return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>团队工作情况 - ${dateStr}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-shrink: 0;
        }
        .date-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .date-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        .date-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .date-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .date-display {
            font-size: 12px;
            font-weight: 500;
            min-width: 160px;
            text-align: center;
        }
        .author-count {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            padding: 0 8px;
        }
        .content {
            flex: 1;
            overflow: auto;
            padding: 8px;
        }
        .timeline-container {
            display: flex;
            gap: 0;
            min-height: 100%;
        }
        .author-column {
            flex: 1;
            min-width: 120px;
            border: 1px solid var(--vscode-panel-border);
            border-left: none;
            border-radius: 0;
            background: var(--vscode-sideBar-background);
            display: flex;
            flex-direction: column;
        }
        .author-column:first-child {
            border-left: 1px solid var(--vscode-panel-border);
            border-radius: 2px 0 0 2px;
        }
        .author-column:last-child {
            border-radius: 0 2px 2px 0;
        }
        .author-header {
            padding: 6px 8px;
            font-weight: 600;
            font-size: 11px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            color: var(--vscode-sideBarTitle-foreground);
            text-align: center;
        }
        .commits-container {
            flex: 1;
            padding: 4px;
            display: flex;
            flex-direction: column;
        }
        .commit-block {
            border-radius: 2px;
            padding: 4px 6px;
            margin-bottom: 4px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 2px solid;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .commit-block:hover {
            transform: translateX(2px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        .commit-merge {
            background: #4a4a4a;
            color: #e0e0e0;
            border-left-color: #666666;
        }
        .commit-fix {
            background: #ffebee;
            color: #c62828;
            border-left-color: #d32f2f;
        }
        .commit-feature {
            background: #e3f2fd;
            color: #1565c0;
            border-left-color: #1976d2;
        }
        .commit-refactor {
            background: #fff9c4;
            color: #f57f17;
            border-left-color: #fbc02d;
        }
        .commit-docs {
            background: #e8f5e9;
            color: #2e7d32;
            border-left-color: #388e3c;
        }
        .commit-default {
            background: #f5f5f5;
            color: #616161;
            border-left-color: #9e9e9e;
        }
        .commit-title {
            font-size: 11px;
            font-weight: 500;
            margin-bottom: 2px;
            word-break: break-word;
            line-height: 1.3;
        }
        .commit-time {
            font-size: 9px;
            opacity: 0.7;
        }
        .no-commits {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px 10px;
            font-size: 11px;
        }
        .empty-state {
            text-align: center;
            padding: 60px 15px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state h2 {
            margin-bottom: 8px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        .empty-state p {
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="date-controls">
            <button class="date-button" id="prevDate" title="前一天">←</button>
            <div class="date-display" id="dateDisplay">${this.escapeHtml(dateStr)}</div>
            <button class="date-button" id="nextDate" title="后一天">→</button>
        </div>
        <div class="author-count">${authorCount} 人</div>
    </div>
    <div class="content">
        ${authorsData.length > 0 ? `
            <div class="timeline-container">
                ${timelineHtml}
            </div>
        ` : `
            <div class="empty-state">
                <h2>暂无数据</h2>
                <p>这一天没有找到任何 git 提交记录</p>
            </div>
        `}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        const prevDateBtn = document.getElementById('prevDate');
        const nextDateBtn = document.getElementById('nextDate');
        const dateDisplay = document.getElementById('dateDisplay');
        
        let currentDate = new Date('${currentDate.toISOString()}');
        
        function updateDate(offset) {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + offset);
            currentDate = newDate;
            
            vscode.postMessage({
                command: 'changeDate',
                date: newDate.toISOString()
            });
        }
        
        prevDateBtn.addEventListener('click', () => updateDate(-1));
        nextDateBtn.addEventListener('click', () => updateDate(1));
        
        // 键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                updateDate(-1);
            } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                updateDate(1);
            }
        });
    </script>
</body>
</html>`;
	}

	private static escapeHtml(text: string): string {
		const map: { [key: string]: string } = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, (m) => map[m]);
	}
}

