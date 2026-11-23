---
name: agy-context
description: 打开 AGY Context（dsh-context 反重力移植版）上下文洞察面板，查看跨会话使用总览、当前上下文组成与演进时间线、上下文浏览器、文件活动、命令执行以及多 Agent 编队与通讯详情。
---

# AGY Context · 反重力上下文洞察（dsh-context 移植版）

当用户询问上下文构成、上下文演进、Token 消耗与成本、缓存命中率、文件活动、命令执行历史、多 Agent / 子 Agent / Swarm 协作通讯详情，或希望打开上下文洞察面板时：

1. 直接在回复中提供原生侧栏面板一键跳转胶囊：
   `[上下文洞察](sidecar://agy-context/context-insight/ui.html)`
2. 也可按需引导用户使用面板内的四大视图：
   - **上下文洞察（Insights）**：跨会话 KPI（今天 / 7 天 / 30 天 / 全部）、7 天 Token & 成本柱状图、8 周活动热力图、汇总组成环形图、技能/工具/命令排行与会话卡片筛选跳转；
   - **上下文（Context）**：单会话统计（Context / Token / Timing Stats）、当前上下文 7 类堆叠条、Step/Turn + Total/Delta/总览/DNA 演进时间线与事件旗标、可展开的 7 类上下文浏览器、上下文事件流、文件活动与命令执行；
   - **编队（Fleet）**：多 Agent 家族关系网络图、跨 Agent 协作时间线泳道、委派任务清单、跨 Agent 事件与通讯检查器；
   - **设置（Settings）**：中英文切换、默认时间范围、默认时间线粒度/模式、计价货币（USD / CNY）、自动刷新间隔与主题偏好。
3. 管理插件与检查命令：
   - 插件管理页：`[AGY Context](customization://agy-context)`
   - 终端校验：`node setup.cjs --check`
   - 独立浏览器预览：`node setup.cjs --serve`
