# 发个东西 - 局域网传输工具

一个基于 WebRTC (PeerJS) 的局域网文件传输和即时消息应用。

## 版本
v1.2.1

## 功能特性

### 核心功能
- 📁 **文件传输**：支持单个或多个文件的发送和接收
- 💬 **即时消息**：支持文字聊天功能
- 🏠 **房间机制**：创建房间或加入现有房间
- 👥 **设备选择**：支持向全房间广播或向指定设备发送
- 📋 **历史记录**：记录文件传输历史
- 📱 **响应式设计**：支持桌面端和移动端
- 🔌 **点对点连接**：使用 WebRTC 实现直接设备间通信

### 高优先级优化（v1.2.0 新增）
- ⚡ **自动重连**：网络中断后自动尝试重连，支持指数退避
- 📦 **模块化架构**：代码拆分为独立模块，提升可维护性
- 💾 **内存优化**：限制并发传输和内存使用，防止大文件导致浏览器崩溃
- ⏸️ **暂停/继续**：支持暂停和继续文件传输（当前仅发送端本地生效，接收端暂停通知与断点续传在规划中）
- 🔔 **浏览器通知**：新消息和文件接收时发送桌面通知

### 中优先级优化
- 📁 **文件夹传输**：（规划中）
- 📱 **PWA 支持**：（规划中）
- 🔒 **端到端加密**：（规划中）

### 低优先级优化
- 🎥 **视频通话**：（规划中）

## 文件结构

```
项目根目录/
├── index.html    # 主页面文件
├── app.js        # 核心应用逻辑（模块化）
├── style.css     # 样式文件
└── README.md     # 项目文档
```

## 快速开始

### 1. 启动应用

将html文件部署到GitHub pages,在浏览器中打开即可使用。

### 2. 创建房间

- 设置昵称（可选）
- 点击「创建房间」按钮
- 系统会生成一个房间号（格式：yanXXXX）
- 等待其他设备加入

### 3. 加入房间

- 设置昵称（可选）
- 点击「加入房间」按钮
- 输入房间号的后四位数字
- 点击「确认加入」

### 4. 使用功能

#### 文件传输
- 点击或拖拽文件到上传区域
- 选择发送目标（全房间或指定设备）
- 点击「发送文件」
- 在传输列表中可以暂停、继续或取消传输
- 在「接收的文件」列表中查看和下载接收到的文件

#### 消息聊天
- 切换到「消息」标签页
- 选择发送目标
- 输入消息内容
- 点击「发送」或按 Enter 键
- 首次使用需要授权浏览器通知权限

## 技术栈

- **前端框架**：原生 JavaScript (ES6+)
- **样式**：CSS3，响应式设计
- **P2P通信**：PeerJS (基于 WebRTC)
- **存储**：localStorage (昵称持久化)

## 模块化架构（v1.2.0）

### Utils 模块
提供通用工具函数：
- `escapeHtml(text)` - HTML 转义
- `formatFileSize(bytes)` - 文件大小格式化
- `getFileIcon(filename)` - 获取文件图标
- `generateId()` - 生成唯一 ID
- `delay(ms)` - 延时函数

### NotificationManager 类
浏览器通知管理器：
- `requestPermission()` - 请求通知权限
- `show(title, options)` - 发送桌面通知（页面可见时不弹出）

### FileTransferManager 类
文件传输管理器：
- `createSendTask(file, targets)` - 创建发送任务
- `createReceiveTask(fileId, fileName, fileSize, totalChunks, senderName)` - 创建接收任务
- `startSend(fileId)` - 开始/继续发送
- `pauseTransfer(fileId)` - 暂停传输（仅发送端）
- `resumeTransfer(fileId)` - 继续传输
- `cancelTransfer(fileId)` - 取消传输
- `handleChunk(fileId, chunk, chunkIndex, totalChunks)` - 处理接收数据块
- `completeReceive(fileId)` - 完成文件接收（校验数据块完整性）
- `cancelReceive(fileId)` - 取消接收
- `cleanupTask(fileId)` / `cleanupAll()` - 清理任务释放内存

### ConnectionManager 类
连接管理器：
- `initPeer(customId)` - 初始化 Peer（支持指定房间号，含 15s 超时保护）
- `connectToRoom(roomId)` - 加入房间（连接房主）
- `connectToDevice(deviceId)` - 连接到指定设备
- `handleNewConnection(conn)` - 处理新接入的连接
- `attemptReconnect()` - 指数退避自动重连
- `startHeartbeat()` / `stopHeartbeat()` - 心跳管理
- `handlePeerError(err)` - 错误分类与提示
- `disconnectAll()` - 断开所有连接并销毁 Peer

### UIController 类
UI 控制器：
- `renderDevicesList(devices, peerId, isHost)` - 渲染设备列表
- `renderTargetDevicesList(type, devices, peerId, selectedTargets)` - 渲染发送目标选择列表
- `renderFileList(files)` / `addProgressItem(task)` / `updateProgress(...)` - 待发送与进度渲染
- `renderMessages(messages)` - 渲染聊天消息（内容做 HTML 转义）
- `renderReceivedFiles(files)` / `renderHistory(history)` - 接收文件与历史记录
- `updateConnectionStatus(status, message)` - 更新连接状态（仅首次连接成功自动跳转文件页）
- `showToast(message, type)` / `switchTab(tabName)` / `resetRoomUI()` - 交互反馈与页面切换

### FileTransferApp 类
主应用类，协调各模块工作。

## 通信协议

应用使用以下消息类型进行通信：

| 消息类型 | 描述 |
|---------|------|
| `nickname` | 发送设备昵称 |
| `heartbeat` | 心跳检测 |
| `request-devices` | 请求房间内设备列表 |
| `devices-list` | 返回设备列表 |
| `new-device` | 新设备加入通知 |
| `device-left` | 设备离开通知 |
| `file-meta` | 文件元数据（接收端超限时不回执创建任务，直接拒绝） |
| `file-chunk` | 文件数据块 |
| `file-complete` | 文件传输完成 |
| `file-cancelled` | 文件传输取消 |
| `file-rejected` | 接收端在 meta 阶段拒绝超大文件（reason: too-large） |
| `message` | 聊天消息 |

> 注：`file-pause` / `file-resume` / `file-resume-request`（含偏移量的断点续传协议）为规划中的消息类型，当前版本尚未实现，暂停仅在发送端本地生效。

## 文件传输机制

- **分块传输**：文件被分成 64KB 的数据块进行传输
- **进度显示**：实时显示传输进度（速度/剩余时间显示在规划中）
- **暂停/继续**：当前仅发送端本地生效；接收端感知与断点续传在规划中
- **内存限制**：接收上限 1GB；接收缓冲使用 Blob（可被浏览器落盘存储），峰值内存远低于文件体积；`file-meta` 阶段即预判拒绝超大文件并回执 `file-rejected`（最大并发传输数限制在规划中）
- **完整性校验**：接收完成时检查数据块是否齐全，缺块则丢弃并提示
- **自动清理**：传输完成后自动清理数据，防止内存泄漏

## 错误处理和重连

- **错误分类**：网络错误、文件错误、连接错误
- **自动重连**：最多 5 次重连尝试，指数退避（2s, 4s, 8s, 16s, 32s）
- **超时保护**：Peer 初始化 15 秒超时自动放弃并提示
- **用户通知**：友好的错误提示和状态更新
- **连接状态**：实时显示连接状态和重连进度

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

注意：需要浏览器支持 WebRTC 和 Notifications API。

## 开发说明

### 依赖项

项目使用 PeerJS 库，通过 CDN 引入：

```html
<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
```

### 配置项

在 app.js 中可以修改以下配置：

- `CHUNK_SIZE = 64 * 1024` - 数据块大小（64KB，FileTransferManager）
- `MAX_MEMORY_SIZE = 1024 * 1024 * 1024` - 接收文件上限（1GB，FileTransferManager）
- `maxReconnectAttempts = 5` - 最大重连次数（ConnectionManager）
- `reconnectDelay = 2000` - 重连初始延迟（ms，ConnectionManager）
- `10000` - 心跳间隔（ms，startHeartbeat）

## 更新日志

### v1.2.1 (2026-09-30)
- 🐛 修复待发送文件列表删除按钮事件重复绑定（点一次连删多个文件）
- 🐛 修复新设备加入时强制跳转到文件页打断用户操作（仅首次连接成功自动跳转）
- 🐛 修复页面切后台再返回时房主被误断开连接
- 🐛 修复下载接收文件时 Object URL 同步释放导致部分浏览器下载失败
- 🧹 删除 FileTransferApp 中重复定义的 `addToHistory` / `addReceivedFile` 及无用的 `receivedFileBlobs`
- 🧹 删除 UIController 中重复的 `switchTab` 定义与重复绑定的 tab 切换监听
- 📝 修订文档中与实现不符的描述（重连参数、暂停/续传范围、模块 API 表）
- ⬆️ 接收上限从 500MB 提升至 1GB：接收缓冲改用 Blob（可落盘），并在 `file-meta` 阶段预判拒绝超大文件、新增 `file-rejected` 回执通知发送方

### v1.2.0 (2026)
- ✅ 添加自动重连机制
- ✅ 代码模块化重构
- ✅ 内存优化和任务管理
- ✅ 暂停/继续传输功能
- ✅ 浏览器通知功能
- ✅ 错误处理优化

### v1.0.0 (2026)
- 🎉 初始版本发布
- 📁 文件传输功能
- 💬 消息聊天功能
- 🏠 房间机制
- 📱 响应式设计

## 作者

Yan Baosheng

## 版权信息

Copyright © 2026 Yan Baosheng
