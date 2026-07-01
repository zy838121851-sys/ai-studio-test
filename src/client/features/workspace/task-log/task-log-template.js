const TASK_LOG_MODAL_TEMPLATE = `
        <div class="task-log-modal" id="taskLogModal" role="dialog" aria-modal="true" aria-label="任务详情" hidden>
          <!-- Detail modal contract: preserve native hidden state and [data-task-log-close] actions. -->
          <div class="task-log-modal-backdrop" data-task-log-close></div>
          <article class="task-log-modal-card">
            <header class="task-log-modal-header">
              <div>
                <p>Task Detail</p>
                <h2>任务详情</h2>
              </div>
              <button type="button" data-task-log-close aria-label="关闭任务详情">×</button>
            </header>
            <div class="task-log-detail-body" id="taskLogDetailBody"></div>
          </article>
        </div>
`;

const TASK_LOG_TEMPLATE = `
        <header class="task-log-heading">
          <div>
            <p>Task Logs</p>
            <h1>任务日志</h1>
            <span>记录图像和视频生成任务，方便测试每一次请求、失败原因和输出结果。</span>
          </div>
          <button class="task-log-refresh" id="taskLogRefresh" type="button" aria-label="刷新任务日志" title="刷新任务日志">↻</button>
        </header>

        <section class="task-log-panel" aria-label="任务日志列表">
          <!-- Filter controls contract: task-log-runtime.js reads these ids for list queries. -->
          <div class="task-log-toolbar">
            <label class="task-log-control task-log-search">
              <span class="visually-hidden">搜索任务 ID</span>
              <input id="taskLogSearch" type="search" placeholder="输入任务 ID 进行筛选" autocomplete="off" />
            </label>
            <label class="task-log-control">
              <span>开始</span>
              <input id="taskLogDateFrom" type="date" />
            </label>
            <label class="task-log-control">
              <span>结束</span>
              <input id="taskLogDateTo" type="date" />
            </label>
            <label class="task-log-control">
              <span class="visually-hidden">任务类型</span>
              <select id="taskLogType">
                <option value="">所有类型</option>
                <option value="image">图像</option>
                <option value="video">视频</option>
                <option value="model3d">3D</option>
              </select>
            </label>
            <label class="task-log-control">
              <span class="visually-hidden">任务状态</span>
              <select id="taskLogStatus">
                <option value="">所有状态</option>
                <option value="queued">排队中</option>
                <option value="running">运行中</option>
                <option value="succeeded">成功</option>
                <option value="failed">失败</option>
                <option value="timeout">超时</option>
                <option value="save_failed">保存失败</option>
                <option value="cancelled">已取消</option>
              </select>
            </label>
          </div>

          <!-- Table shell contract: keep columns and #taskLogRows stable for runtime rendering. -->
          <div class="task-log-table-wrap">
            <table class="task-log-table">
              <thead>
                <tr>
                  <th scope="col">时间</th>
                  <th scope="col">类型</th>
                  <th scope="col">模型</th>
                  <th scope="col">价格 (Credits)</th>
                  <th scope="col">任务 ID</th>
                  <th scope="col">耗时</th>
                  <th scope="col">状态</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <!-- Runtime rows root: task-log-runtime.js delegates row actions from #taskLogRows. -->
              <tbody id="taskLogRows">
                <tr><td colspan="8">正在加载任务日志...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination contract: runtime mutates range text, buttons, and page-size select. -->
          <footer class="task-log-footer">
            <span id="taskLogRange">显示第 0 - 0 条 共 0 条</span>
            <div class="task-log-pagination">
              <button id="taskLogPrev" type="button">上一页</button>
              <button id="taskLogNext" type="button">下一页</button>
              <label>
                <span class="visually-hidden">每页条数</span>
                <select id="taskLogLimit">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </label>
            </div>
          </footer>
        </section>

${TASK_LOG_MODAL_TEMPLATE}
`;

export function ensureTaskLogTemplate(root = document) {
  const page = root.querySelector("#taskLogPage");
  if (!page || page.querySelector("#taskLogRows")) return page;
  page.innerHTML = TASK_LOG_TEMPLATE;
  return page;
}
