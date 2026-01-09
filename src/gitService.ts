import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitCommit {
	hash: string;
	author: string;
	authorDate: Date;
	title: string;
	message: string;
}

export class GitService {
	private workspaceRoot: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	/**
	 * 获取指定日期的所有提交（按作者时间）
	 * @param date 日期对象
	 * @returns 提交列表
	 */
	async getCommitsByDate(date: Date): Promise<GitCommit[]> {
		try {
			// 获取当天的开始和结束时间
			const startDate = new Date(date);
			startDate.setHours(0, 0, 0, 0);
			const endDate = new Date(date);
			endDate.setHours(23, 59, 59, 999);

			// 为了确保能获取到所有按作者时间在该日期的提交，
			// 我们需要获取一个更宽的时间范围（因为 --since/--until 是按提交时间过滤的）
			// 然后在代码中按作者时间精确过滤
			const extendedStartDate = new Date(startDate);
			extendedStartDate.setDate(extendedStartDate.getDate() - 7); // 往前7天
			const extendedEndDate = new Date(endDate);
			extendedEndDate.setDate(extendedEndDate.getDate() + 1); // 往后1天

			// 格式化日期为 ISO 8601 格式
			const extendedStartDateStr = extendedStartDate.toISOString();
			const extendedEndDateStr = extendedEndDate.toISOString();

			// 使用 git log 获取扩展日期范围内的所有提交
			// %aI 是作者时间的 ISO 8601 格式
			// --all 获取所有分支的提交
			const command = `git log --since="${extendedStartDateStr}" --until="${extendedEndDateStr}" --format="%H|%an|%aI|%s|%b" --all`;

			const { stdout } = await execAsync(command, {
				cwd: this.workspaceRoot,
				maxBuffer: 10 * 1024 * 1024 // 10MB buffer
			});

			if (!stdout.trim()) {
				return [];
			}

			const commits: GitCommit[] = [];
			const lines = stdout.trim().split('\n');

			for (const line of lines) {
				const parts = line.split('|');
				if (parts.length >= 4) {
					const hash = parts[0];
					const author = parts[1];
					const authorDateStr = parts[2];
					const title = parts[3];
					const message = parts.slice(4).join('|').trim();

					const authorDate = new Date(authorDateStr);

					// 按作者时间精确过滤到指定日期
					if (authorDate >= startDate && authorDate <= endDate) {
						commits.push({
							hash,
							author,
							authorDate,
							title: title.trim(),
							message: message || title.trim()
						});
					}
				}
			}

			// 按作者时间排序（从早到晚）
			commits.sort((a, b) => a.authorDate.getTime() - b.authorDate.getTime());

			return commits;
		} catch (error: any) {
			// 如果 git 命令失败（比如不在 git 仓库中），返回空数组
			if (error.code === 'ENOENT' || error.message?.includes('not a git repository')) {
				return [];
			}
			console.error('获取 git 提交失败:', error);
			return [];
		}
	}

	/**
	 * 获取指定周的所有提交（按作者时间）
	 * @param date 日期对象，会计算该日期所在周的开始和结束
	 * @returns 提交列表
	 */
	async getCommitsByWeek(date: Date): Promise<GitCommit[]> {
		try {
			// 计算该日期所在周的开始（周一）和结束（周日）
			const weekStart = new Date(date);
			const dayOfWeek = weekStart.getDay();
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 如果是周日，往前6天；否则往前到周一
			weekStart.setDate(weekStart.getDate() + diff);
			weekStart.setHours(0, 0, 0, 0);

			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekEnd.getDate() + 6);
			weekEnd.setHours(23, 59, 59, 999);

			// 扩展时间范围以确保获取所有相关提交
			const extendedStartDate = new Date(weekStart);
			extendedStartDate.setDate(extendedStartDate.getDate() - 7);
			const extendedEndDate = new Date(weekEnd);
			extendedEndDate.setDate(extendedEndDate.getDate() + 7);

			const extendedStartDateStr = extendedStartDate.toISOString();
			const extendedEndDateStr = extendedEndDate.toISOString();

			const command = `git log --since="${extendedStartDateStr}" --until="${extendedEndDateStr}" --format="%H|%an|%aI|%s|%b" --all`;

			const { stdout } = await execAsync(command, {
				cwd: this.workspaceRoot,
				maxBuffer: 10 * 1024 * 1024
			});

			if (!stdout.trim()) {
				return [];
			}

			const commits: GitCommit[] = [];
			const lines = stdout.trim().split('\n');

			for (const line of lines) {
				const parts = line.split('|');
				if (parts.length >= 4) {
					const hash = parts[0];
					const author = parts[1];
					const authorDateStr = parts[2];
					const title = parts[3];
					const message = parts.slice(4).join('|').trim();

					const authorDate = new Date(authorDateStr);

					// 按作者时间精确过滤到指定周
					if (authorDate >= weekStart && authorDate <= weekEnd) {
						commits.push({
							hash,
							author,
							authorDate,
							title: title.trim(),
							message: message || title.trim()
						});
					}
				}
			}

			// 按作者时间排序（从早到晚）
			commits.sort((a, b) => a.authorDate.getTime() - b.authorDate.getTime());

			return commits;
		} catch (error: any) {
			if (error.code === 'ENOENT' || error.message?.includes('not a git repository')) {
				return [];
			}
			console.error('获取 git 提交失败:', error);
			return [];
		}
	}

	/**
	 * 检查当前工作区是否是 git 仓库
	 */
	async isGitRepository(): Promise<boolean> {
		try {
			await execAsync('git rev-parse --git-dir', {
				cwd: this.workspaceRoot
			});
			return true;
		} catch {
			return false;
		}
	}
}

