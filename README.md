# 发个东西 - 局域网传输工具

一个基于 WebRTC (PeerJS) 的局域网文件传输和即时消息应用。

## 版本
v1.2.0

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
- ⏸️ **暂停/继续**：支持暂停和继续文件传输
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
- `send(title, body, icon)` - 发送通知
- `isSupported()` - 检查浏览器支持

### FileTransferManager 类
文件传输管理器：
- `sendFiles(files, onProgress, onComplete, onError)` - 发送文件
- `handleMeta(meta)` - 处理文件元数据
- `handleChunk(chunk)` - 处理文件数据块
- `handleComplete(completeData)` - 处理传输完成
- `cancelTransfer(transferId)` - 取消传输
- `pauseTransfer(transferId)` - 暂停传输
- `resumeTransfer(transferId)` - 继续传输
- `cleanup()` - 清理资源

### ConnectionManager 类
连接管理器：
- `initialize(peerId)` - 初始化连接
- `connectTo(targetId)` - 连接到目标
- `send(data)` - 发送数据
- `disconnect()` - 断开连接
- `reconnect()` - 尝试重连
- `isConnected()` - 检查连接状态

### UIController 类
UI 控制器：
- `renderDeviceList(devices)` - 渲染设备列表
- `renderProgressItem(item)` - 渲染传输进度项
- `renderReceivedFile(file)` - 渲染接收的文件
- `renderHistoryItem(item)` - 渲染历史项
- `renderMessage(msg)` - 渲染消息
- `updateConnectionStatus(status)` - 更新连接状态

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
| `file-meta` | 文件元数据 |
| `file-chunk` | 文件数据块 |
| `file-complete` | 文件传输完成 |
| `file-cancelled` | 文件传输取消 |
| `file-pause` | 暂停传输 |
| `file-resume` | 继续传输 |
| `file-resume-request` | 请求恢复传输（含偏移量） |
| `message` | 聊天消息 |

## 文件传输机制

- **分块传输**：文件被分成 64KB 的数据块进行传输
- **进度显示**：实时显示传输进度、速度和剩余时间
- **暂停/继续**：支持暂停和恢复传输，支持从断点续传
- **内存限制**：最大并发传输数（3）和内存上限（500MB）
- **自动清理**：传输完成后自动清理数据，防止内存泄漏

## 错误处理和重连

- **错误分类**：网络错误、文件错误、连接错误
- **自动重连**：3次重连尝试，指数退避（1s, 2s, 4s）
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

- `MAX_CONCURRENT_TRANSFERS = 3` - 最大并发传输数
- `MAX_MEMORY_SIZE = 500 * 1024 * 1024` - 最大内存使用（500MB）
- `CHUNK_SIZE = 64 * 1024` - 数据块大小（64KB）
- `MAX_RECONNECT_ATTEMPTS = 3` - 最大重连次数
- `RECONNECT_DELAY = 1000` - 重连初始延迟（ms）

## 更新日志

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
