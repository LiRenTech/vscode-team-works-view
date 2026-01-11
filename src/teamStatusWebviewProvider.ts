import * as vscode from 'vscode';
import * as path from 'path';
import { GitService, GitCommit } from './gitService';

export type ViewMode = 'day' | 'week';

export class TeamStatusWebviewProvider {
	private static dayPanel: vscode.WebviewPanel | undefined = undefined;
	private static weekPanel: vscode.WebviewPanel | undefined = undefined;
	private static dayDate: Date = new Date();
	private static weekDate: Date = new Date();
	private static gitService: GitService | undefined = undefined;

	public static createOrShow(context: vscode.ExtensionContext, viewMode: ViewMode = 'day') {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// 根据视图模式获取对应的面板和日期
		let currentPanel: vscode.WebviewPanel | undefined;
		let currentDate: Date;
		
		if (viewMode === 'day') {
			currentPanel = TeamStatusWebviewProvider.dayPanel;
			currentDate = TeamStatusWebviewProvider.dayDate;
		} else {
			currentPanel = TeamStatusWebviewProvider.weekPanel;
			currentDate = TeamStatusWebviewProvider.weekDate;
		}

		// 如果已经存在对应视图模式的面板，则显示它
		if (currentPanel) {
			currentPanel.reveal(column);
			return;
		}

		// 初始化 git service
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			TeamStatusWebviewProvider.gitService = new GitService(workspaceFolders[0].uri.fsPath);
		}

		// 创建新的 webview 面板，使用不同的 viewType 来区分天视图和周视图
		const panelId = viewMode === 'day' ? 'teamStatusViewDay' : 'teamStatusViewWeek';
		const panelTitle = viewMode === 'day' ? '团队工作情况（天视图）' : '团队工作情况（周视图）';
		
		const panel = vscode.window.createWebviewPanel(
			panelId,
			panelTitle,
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
			}
		);

		// 加载初始数据
		TeamStatusWebviewProvider.updateWebviewContent(panel, context, currentDate, viewMode);

		// 处理来自 webview 的消息
		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'changeDate':
						const newDate = new Date(message.date);
						// 根据视图模式更新对应的日期
						if (viewMode === 'day') {
							TeamStatusWebviewProvider.dayDate = newDate;
						} else {
							TeamStatusWebviewProvider.weekDate = newDate;
						}
						await TeamStatusWebviewProvider.updateWebviewContent(
							panel,
							context,
							newDate,
							viewMode
						);
						return;
				}
			},
			null,
			context.subscriptions
		);

		// 当面板被关闭时，清理对应的引用
		panel.onDidDispose(
			() => {
				if (viewMode === 'day') {
					TeamStatusWebviewProvider.dayPanel = undefined;
				} else {
					TeamStatusWebviewProvider.weekPanel = undefined;
				}
			},
			null,
			context.subscriptions
		);

		// 保存面板引用
		if (viewMode === 'day') {
			TeamStatusWebviewProvider.dayPanel = panel;
		} else {
			TeamStatusWebviewProvider.weekPanel = panel;
		}
	}

	private static async updateWebviewContent(
		panel: vscode.WebviewPanel,
		context: vscode.ExtensionContext,
		date: Date,
		viewMode: ViewMode
	) {
		// 根据视图模式获取提交数据
		let commits: GitCommit[] = [];
		if (TeamStatusWebviewProvider.gitService) {
			if (viewMode === 'day') {
				commits = await TeamStatusWebviewProvider.gitService.getCommitsByDate(date);
			} else {
				commits = await TeamStatusWebviewProvider.gitService.getCommitsByWeek(date);
			}
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
		let dateStr: string;
		if (viewMode === 'day') {
			dateStr = date.toLocaleDateString('zh-CN', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long'
			});
		} else {
			// 计算周的开始和结束日期
			const weekStart = new Date(date);
			const dayOfWeek = weekStart.getDay();
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			weekStart.setDate(weekStart.getDate() + diff);
			weekStart.setHours(0, 0, 0, 0);

			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekEnd.getDate() + 6);

			const startStr = weekStart.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
			const endStr = weekEnd.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
			const year = weekStart.getFullYear();
			dateStr = `${year}年 ${startStr} - ${endStr}`;
		}

		panel.webview.html = TeamStatusWebviewProvider.getWebviewContent(
			context,
			panel.webview,
			date,
			dateStr,
			Array.from(authorsMap.entries()),
			commits,
			viewMode
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
		} else if (lowerTitle.startsWith('feat')) {
			return 'commit-feature';
		} else if (lowerTitle.startsWith('refactor')) {
			return 'commit-refactor';
		} else if (lowerTitle.startsWith('docs')) {
			return 'commit-docs';
		} else if (lowerTitle.startsWith('style')) {
			return 'commit-style';
		} else {
			return 'commit-default';
		}
	}

	/**
	 * 检查是否是 Merge 提交
	 */
	private static isMergeCommit(title: string): boolean {
		const lowerTitle = title.toLowerCase().trim();
		return lowerTitle.startsWith('merge branch') || lowerTitle.startsWith('merge ');
	}

	private static getWebviewContent(
		context: vscode.ExtensionContext,
		webview: vscode.Webview,
		currentDate: Date,
		dateStr: string,
		authorsData: [string, GitCommit[]][],
		allCommits: GitCommit[],
		viewMode: ViewMode
	): string {
		const authorCount = authorsData.length;

		// 根据视图模式计算前一个和后一个时间单位
		let prevDate: Date;
		let nextDate: Date;
		
		if (viewMode === 'day') {
			prevDate = new Date(currentDate);
			prevDate.setDate(prevDate.getDate() - 1);
			nextDate = new Date(currentDate);
			nextDate.setDate(nextDate.getDate() + 1);
		} else {
			// 周视图：计算前一周和后一周
			const weekStart = new Date(currentDate);
			const dayOfWeek = weekStart.getDay();
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			weekStart.setDate(weekStart.getDate() + diff);
			
			prevDate = new Date(weekStart);
			prevDate.setDate(prevDate.getDate() - 7);
			
			nextDate = new Date(weekStart);
			nextDate.setDate(nextDate.getDate() + 7);
		}

		// 将数据序列化为 JSON，供 JavaScript 使用
		const authorsDataJson = JSON.stringify(
			authorsData.map(([author, commits]) => [
				author,
				commits.map(commit => ({
					hash: commit.hash,
					author: commit.author,
					authorDate: commit.authorDate.toISOString(),
					title: commit.title,
					message: commit.message,
					fileCount: commit.fileCount,
					insertions: commit.insertions,
					deletions: commit.deletions
				}))
			])
		);

		// 生成初始时间线 HTML（显示所有提交，JavaScript 会处理过滤）
		const timelineHtml = authorsData.map(([author, commits]) => {
			// 计算该作者的总统计信息
			const totalFileCount = commits.reduce((sum, commit) => sum + commit.fileCount, 0);
			const totalInsertions = commits.reduce((sum, commit) => sum + commit.insertions, 0);
			const totalDeletions = commits.reduce((sum, commit) => sum + commit.deletions, 0);

			const commitBlocks = commits.map(commit => {
				const timeStr = commit.authorDate.toLocaleTimeString('zh-CN', {
					hour: '2-digit',
					minute: '2-digit'
				});
				const colorClass = this.getCommitColorClass(commit.title);
				const isMerge = this.isMergeCommit(commit.title);

				return `
					<div class="commit-block ${colorClass}" data-is-merge="${isMerge}" title="${commit.title} - ${timeStr}">
						<div class="commit-title">${this.escapeHtml(commit.title)}</div>
						<div class="commit-time">${timeStr}</div>
					</div>
				`;
			}).join('');

			return `
				<div class="author-column" data-author="${this.escapeHtml(author)}">
					<div class="author-header">
						<div class="author-name">${this.escapeHtml(author)}</div>
						<div class="author-stats">
							<div class="stat-line">${totalFileCount} 个文件</div>
							<div class="stat-line">
								<span class="stat-add">+${totalInsertions}</span>
								<span class="stat-del">-${totalDeletions}</span>
							</div>
						</div>
					</div>
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
        .filter-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 8px;
        }
        .filter-label {
            font-size: 11px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
        }
        .filter-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
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
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            text-align: center;
        }
        .author-name {
            font-weight: 600;
            font-size: 11px;
            color: var(--vscode-sideBarTitle-foreground);
            margin-bottom: 4px;
        }
        .author-stats {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        .stat-line {
            margin-top: 2px;
            line-height: 1.3;
        }
        .stat-add {
            color: #81c784;
            margin-right: 6px;
        }
        .stat-del {
            color: #e57373;
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
            background: #3a3a3a;
            color: #d0d0d0;
            border-left-color: #666666;
        }
        .commit-fix {
            background: #5c2a2a;
            color: #ff6b6b;
            border-left-color: #d32f2f;
        }
        .commit-feature {
            background: #1e3a5f;
            color: #64b5f6;
            border-left-color: #1976d2;
        }
        .commit-refactor {
            background: #5c4a1e;
            color: #ffb74d;
            border-left-color: #fbc02d;
        }
        .commit-docs {
            background: #2a4a2a;
            color: #81c784;
            border-left-color: #388e3c;
        }
        .commit-style {
            background: #4a2a4a;
            color: #f48fb1;
            border-left-color: #c2185b;
        }
        .commit-default {
            background: #3a3a3a;
            color: #b0b0b0;
            border-left-color: #666666;
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
            <button class="date-button" id="prevDate" title="${viewMode === 'day' ? '前一天' : '上一周'}">←</button>
            <div class="date-display" id="dateDisplay">${this.escapeHtml(dateStr)}</div>
            <button class="date-button" id="nextDate" title="${viewMode === 'day' ? '后一天' : '下一周'}">→</button>
        </div>
        <div class="filter-controls">
            <label class="filter-label">
                <input type="checkbox" class="filter-checkbox" id="hideMergeCheckbox" checked>
                <span>隐藏 Merge 提交</span>
            </label>
        </div>
        <div class="author-count" id="authorCount">${authorCount} 人</div>
    </div>
    <div class="content" id="content">
        ${authorsData.length > 0 ? `
            <div class="timeline-container" id="timelineContainer">
                ${timelineHtml}
            </div>
        ` : `
            <div class="empty-state">
                <h2>暂无数据</h2>
                <p>${viewMode === 'day' ? '这一天' : '这一周'}没有找到任何 git 提交记录</p>
            </div>
        `}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        const prevDateBtn = document.getElementById('prevDate');
        const nextDateBtn = document.getElementById('nextDate');
        const dateDisplay = document.getElementById('dateDisplay');
        const hideMergeCheckbox = document.getElementById('hideMergeCheckbox');
        const timelineContainer = document.getElementById('timelineContainer');
        const authorCountEl = document.getElementById('authorCount');
        const contentEl = document.getElementById('content');
        
        let currentDate = new Date('${currentDate.toISOString()}');
        const authorsData = ${authorsDataJson};
        const viewMode = '${viewMode}';
        
        // 辅助函数：转义 HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 辅助函数：获取 commit 颜色类
        function getCommitColorClass(title) {
            const lowerTitle = title.toLowerCase().trim();
            if (lowerTitle.startsWith('merge ')) {
                return 'commit-merge';
            } else if (lowerTitle.startsWith('fix')) {
                return 'commit-fix';
            } else if (lowerTitle.startsWith('feat')) {
                return 'commit-feature';
            } else if (lowerTitle.startsWith('refactor')) {
                return 'commit-refactor';
            } else if (lowerTitle.startsWith('docs')) {
                return 'commit-docs';
            } else if (lowerTitle.startsWith('style')) {
                return 'commit-style';
            } else {
                return 'commit-default';
            }
        }
        
        // 检查是否是 Merge 提交
        function isMergeCommit(title) {
            const lowerTitle = title.toLowerCase().trim();
            return lowerTitle.startsWith('merge branch') || lowerTitle.startsWith('merge ');
        }
        
        // 渲染时间线
        function renderTimeline(hideMerge) {
            if (!timelineContainer) return;
            
            const filteredAuthorsData = authorsData.map(([author, commits]) => {
                const filteredCommits = hideMerge 
                    ? commits.filter(commit => !isMergeCommit(commit.title))
                    : commits;
                return [author, filteredCommits];
            });
            
            // 计算实际显示的作者数量（有提交的作者）
            const visibleAuthors = filteredAuthorsData.filter(([author, commits]) => commits.length > 0);
            const authorCount = visibleAuthors.length;
            
            // 更新作者数量显示
            if (authorCountEl) {
                authorCountEl.textContent = authorCount + ' 人';
            }
            
            // 如果没有数据，显示空状态
            if (authorCount === 0) {
                timelineContainer.innerHTML = '<div class="empty-state"><h2>暂无数据</h2><p>' + 
                    (viewMode === 'day' ? '这一天' : '这一周') + '没有找到任何 git 提交记录</p></div>';
                return;
            }
            
            // 生成 HTML
            const html = filteredAuthorsData.map(([author, commits]) => {
                if (commits.length === 0) return '';
                
                const commitBlocks = commits.map(commit => {
                    const commitDate = new Date(commit.authorDate);
                    const timeStr = commitDate.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const colorClass = getCommitColorClass(commit.title);
                    
                    return \`
                        <div class="commit-block \${colorClass}" title="\${escapeHtml(commit.title)} - \${timeStr}">
                            <div class="commit-title">\${escapeHtml(commit.title)}</div>
                            <div class="commit-time">\${timeStr}</div>
                        </div>
                    \`;
                }).join('');
                
                return \`
                    <div class="author-column">
                        <div class="author-header">\${escapeHtml(author)}</div>
                        <div class="commits-container">
                            \${commitBlocks}
                        </div>
                    </div>
                \`;
            }).filter(html => html).join('');
            
            timelineContainer.innerHTML = html;
        }
        
        // 切换 Merge 提交的显示/隐藏
        function toggleMergeCommits(hideMerge) {
            const commitBlocks = document.querySelectorAll('.commit-block[data-is-merge="true"]');
            commitBlocks.forEach(block => {
                block.style.display = hideMerge ? 'none' : '';
            });
            
            // 更新作者列：如果某列的所有提交都被隐藏，隐藏整列
            const authorColumns = document.querySelectorAll('.author-column');
            authorColumns.forEach(column => {
                const visibleCommits = column.querySelectorAll('.commit-block:not([style*="display: none"])');
                if (visibleCommits.length === 0) {
                    column.style.display = 'none';
                } else {
                    column.style.display = '';
                }
            });
            
            // 更新作者数量
            const visibleColumns = document.querySelectorAll('.author-column:not([style*="display: none"])');
            if (authorCountEl) {
                authorCountEl.textContent = visibleColumns.length + ' 人';
            }
        }
        
        // 初始化：默认隐藏 Merge
        toggleMergeCommits(true);
        
        // 监听开关变化
        hideMergeCheckbox.addEventListener('change', (e) => {
            toggleMergeCommits(e.target.checked);
        });
        
        function updateDate(offset) {
            const newDate = new Date(currentDate);
            if (viewMode === 'day') {
                newDate.setDate(newDate.getDate() + offset);
            } else {
                // 周视图：计算当前周的开始
                const weekStart = new Date(newDate);
                const dayOfWeek = weekStart.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                weekStart.setDate(weekStart.getDate() + diff);
                // 加上偏移周数
                weekStart.setDate(weekStart.getDate() + (offset * 7));
                newDate.setTime(weekStart.getTime());
            }
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

