class FileTransferApp {
    constructor() {
        this.peer = null;
        this.connections = [];
        this.devices = {};
        this.pendingConnections = new Set();
        this.roomId = null;
        this.peerId = null;
        this.nickname = localStorage.getItem('nickname') || '匿名';
        this.filesToSend = [];
        this.receivedFiles = [];
        this.transferHistory = [];
        this.messages = [];
        this.fileChunks = {};
        this.CHUNK_SIZE = 16 * 1024;
        this.isHost = false;

        this.initElements();
        this.initEventListeners();
        this.loadNickname();
    }

    initElements() {
        this.elements = {
            nicknameInput: document.getElementById('nicknameInput'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            roomDisplay: document.getElementById('roomDisplay'),
            roomId: document.getElementById('roomId'),
            connectionStatus: document.getElementById('connectionStatus'),
            joinForm: document.getElementById('joinForm'),
            roomIdInput: document.getElementById('roomIdInput'),
            devicesList: document.getElementById('devicesList'),
            devicesListContent: document.getElementById('devicesListContent'),
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            fileList: document.getElementById('fileList'),
            sendFilesBtn: document.getElementById('sendFilesBtn'),
            messageInput: document.getElementById('messageInput'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            messagesList: document.getElementById('messagesList'),
            progressList: document.getElementById('progressList'),
            transferHistory: document.getElementById('transferHistory'),
            toast: document.getElementById('toast')
        };
    }

    initEventListeners() {
        this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.elements.joinRoomBtn.addEventListener('click', () => this.showJoinForm());
        this.elements.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.sendFilesBtn.addEventListener('click', () => this.sendFiles());
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());

        this.elements.dropZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.dropZone.classList.add('dragover');
        });

        this.elements.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.dropZone.classList.remove('dragover');
        });

        this.elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileDrop(e.dataTransfer.files);
            }
        });

        this.elements.nicknameInput.addEventListener('input', (e) => {
            this.nickname = e.target.value.trim();
            localStorage.setItem('nickname', this.nickname);
        });

        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    loadNickname() {
        if (this.nickname) {
            this.elements.nicknameInput.value = this.nickname;
        }
    }

    generateRoomId() {
        const num = Math.floor(1000 + Math.random() * 9000);
        return 'yan' + num;
    }

    createRoom() {
        this.roomId = this.generateRoomId();
        this.isHost = true;
        this.elements.roomId.textContent = this.roomId;
        this.elements.roomDisplay.classList.add('show');
        this.elements.createRoomBtn.classList.add('hidden');
        this.elements.joinRoomBtn.classList.add('hidden');

        this.initPeer(this.roomId);
        this.addMyDevice();
        this.showToast('房间创建成功', 'success');
    }

    showJoinForm() {
        this.elements.joinForm.classList.toggle('show');
        this.elements.joinRoomBtn.classList.add('hidden');
    }

    joinRoom() {
        const inputRoomId = this.elements.roomIdInput.value.trim();
        if (!inputRoomId) {
            this.showToast('请输入房间号', 'error');
            return;
        }

        this.roomId = inputRoomId;
        this.isHost = false;
        this.elements.roomId.textContent = this.roomId;
        this.elements.roomDisplay.classList.add('show');
        this.elements.joinForm.classList.remove('show');

        this.initPeer();
        this.showToast('正在连接...', 'success');
    }

    addMyDevice() {
        this.devices[this.peerId] = {
            id: this.peerId,
            nickname: this.nickname,
            joinedAt: Date.now()
        };
        this.renderDevicesList();
    }

    addDevice(deviceId, nickname) {
        this.devices[deviceId] = {
            id: deviceId,
            nickname: nickname,
            joinedAt: Date.now()
        };
        this.renderDevicesList();
        this.showToast(`${nickname} 加入了房间`, 'success');
    }

    removeDevice(deviceId) {
        if (this.devices[deviceId]) {
            const nickname = this.devices[deviceId].nickname;
            delete this.devices[deviceId];
            this.renderDevicesList();
            this.showToast(`${nickname} 已离开`, 'success');
        }

        this.connections = this.connections.filter(c => c.peer !== deviceId);

        if (Object.keys(this.devices).length <= 1) {
            this.updateConnectionStatus('waiting', '等待连接');
        } else {
            const count = Object.keys(this.devices).length - 1;
            this.updateConnectionStatus('connected', `${count} 个设备已连接`);
        }
    }

    renderDevicesList() {
        const deviceIds = Object.keys(this.devices);
        
        if (deviceIds.length <= 1) {
            this.elements.devicesList.classList.add('hidden');
            return;
        }

        this.elements.devicesList.classList.remove('hidden');

        const icons = ['💻', '📱', '📱', '📱', '📱', '💻', '📱', '💻'];
        
        this.elements.devicesListContent.innerHTML = deviceIds.map((id, index) => {
            if (id === this.peerId) return '';
            const device = this.devices[id];
            const icon = device.nickname.includes('手机') ? '📱' : 
                         device.nickname.includes('电脑') ? '💻' : 
                         icons[index % icons.length];
            return `
                <div class="device-item">
                    <span class="device-icon">${icon}</span>
                    <span class="device-name">${device.nickname}</span>
                    <span class="device-status"></span>
                </div>
            `;
        }).join('');
    }

    initPeer(customId = null) {
        if (this.peer) {
            this.peer.destroy();
        }

        const peerConfig = {
            debug: 1
        };

        if (customId) {
            peerConfig.id = customId;
        }

        this.peer = new Peer(customId, peerConfig);

        this.peer.on('open', (id) => {
            this.peerId = id;
            this.updateConnectionStatus('waiting', '等待连接...');

            if (this.isHost) {
                this.addMyDevice();
            } else {
                setTimeout(() => this.connectToRoom(this.roomId), 500);
            }
        });

        this.peer.on('connection', (conn) => {
            this.handleNewConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'unavailable-id') {
                this.showToast('房间号已被占用', 'error');
                this.updateConnectionStatus('error', '房间号无效');
            } else if (err.type === 'peer-unavailable') {
                this.showToast('房间不存在', 'error');
                this.updateConnectionStatus('error', '连接失败');
            } else {
                this.showToast('连接错误', 'error');
            }
        });

        this.peer.on('disconnected', () => {
            this.updateConnectionStatus('waiting', '连接已断开');
        });
    }

    connectToRoom(roomId) {
        const conn = this.peer.connect(roomId, {
            reliable: true
        });

        conn.on('open', () => {
            this.handleNewConnection(conn);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.showToast('连接失败', 'error');
        });
    }

    handleNewConnection(conn) {
        this.connections.push(conn);

        conn.on('open', () => {
            this.pendingConnections.add(conn.peer);
            setTimeout(() => {
                if (this.pendingConnections.has(conn.peer)) {
                    this.pendingConnections.delete(conn.peer);
                    if (!this.devices[conn.peer]) {
                        this.connections = this.connections.filter(c => c.peer !== conn.peer);
                    }
                }
            }, 10000);
            this.sendNickname(conn);
        });

        conn.on('data', (data) => {
            if (data.type === 'nickname') {
                this.pendingConnections.delete(conn.peer);
                if (!this.devices[conn.peer]) {
                    this.onPeerConnected(conn.peer);
                }
                this.devices[conn.peer] = {
                    id: conn.peer,
                    nickname: data.nickname,
                    joinedAt: Date.now()
                };
                this.renderDevicesList();
                this.showToast(`${data.nickname} 加入了房间`, 'success');
            } else {
                this.handleData(data, conn);
            }
        });

        conn.on('close', () => {
            this.pendingConnections.delete(conn.peer);
            this.removeDevice(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    sendNickname(conn = null) {
        const message = {
            type: 'nickname',
            nickname: this.nickname,
            from: this.peerId
        };

        if (conn) {
            conn.send(message);
        } else {
            this.broadcast(message);
        }
    }

    broadcast(data) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    broadcastExcept(excludePeerId, data) {
        this.connections.forEach(conn => {
            if (conn.open && conn.peer !== excludePeerId) {
                conn.send(data);
            }
        });
    }

    onPeerConnected(deviceId) {
        const count = this.connections.length;
        this.updateConnectionStatus('connected', `${count} 个设备已连接`);
    }

    updateConnectionStatus(status, message) {
        this.elements.connectionStatus.textContent = message;
        this.elements.connectionStatus.className = 'status ' + status;
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFilesToQueue(files);
    }

    handleFileDrop(files) {
        this.addFilesToQueue(Array.from(files));
    }

    addFilesToQueue(files) {
        files.forEach(file => {
            if (!this.filesToSend.find(f => f.name === file.name && f.size === file.size)) {
                this.filesToSend.push(file);
            }
        });
        this.renderFileList();
        this.elements.sendFilesBtn.classList.remove('hidden');
    }

    renderFileList() {
        this.elements.fileList.innerHTML = this.filesToSend.map((file, index) => `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <span class="file-icon">${this.getFileIcon(file.name)}</span>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="file-remove">×</button>
            </div>
        `).join('');

        this.initFileListEvents();
    }

    initFileListEvents() {
        this.elements.fileList.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.file-remove');
            if (removeBtn) {
                const fileItem = removeBtn.closest('.file-item');
                const index = parseInt(fileItem.dataset.index, 10);
                if (!isNaN(index) && index >= 0 && index < this.filesToSend.length) {
                    this.removeFile(index);
                }
            }
        });
    }

    removeFile(index) {
        this.filesToSend.splice(index, 1);
        this.renderFileList();
        if (this.filesToSend.length === 0) {
            this.elements.sendFilesBtn.classList.add('hidden');
        }
    }

    sendFiles() {
        if (this.filesToSend.length === 0) {
            this.showToast('请选择文件', 'error');
            return;
        }

        if (this.connections.length === 0 || !this.connections.some(c => c.open)) {
            this.showToast('未连接', 'error');
            return;
        }

        this.elements.progressList.innerHTML = '';
        this.fileChunks = {};

        this.filesToSend.forEach(file => {
            this.sendFile(file);
        });

        this.filesToSend = [];
        this.renderFileList();
    }

    sendFile(file) {
        const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const fileSize = file.size;
        const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

        this.broadcast({
            type: 'file-meta',
            fileId: fileId,
            fileName: file.name,
            fileSize: fileSize,
            totalChunks: totalChunks,
            senderName: this.nickname || '匿名'
        });

        this.addProgressItem(fileId, file.name, fileSize);

        let currentChunk = 0;
        let lastProgressTime = Date.now();

        const sendNext = () => {
            if (currentChunk >= totalChunks) {
                this.broadcast({
                    type: 'file-complete',
                    fileId: fileId,
                    fileSize: fileSize
                });

                this.updateProgress(fileId, 100, fileSize, '已完成');
                this.addToHistory('sent', file.name, fileSize);
                this.showToast(`已发送: ${file.name}`, 'success');
                return;
            }

            const start = currentChunk * this.CHUNK_SIZE;
            const end = Math.min(start + this.CHUNK_SIZE, fileSize);
            const chunkData = file.slice(start, end);

            if (chunkData.size === 0) {
                currentChunk = totalChunks;
                this.broadcast({
                    type: 'file-complete',
                    fileId: fileId,
                    fileSize: fileSize
                });
                return;
            }

            this.broadcast({
                type: 'file-chunk',
                fileId: fileId,
                chunk: chunkData,
                chunkIndex: currentChunk,
                totalChunks: totalChunks
            });

            currentChunk++;

            const now = Date.now();
            if (now - lastProgressTime >= 100) {
                const progress = Math.round((currentChunk / totalChunks) * 100);
                const bytesSent = Math.min(currentChunk * this.CHUNK_SIZE, fileSize);
                this.updateProgress(fileId, progress, bytesSent);
                lastProgressTime = now;
            }

            if (currentChunk < totalChunks) {
                setTimeout(sendNext, 5);
            } else {
                this.conn.send({
                    type: 'file-complete',
                    fileId: fileId,
                    fileSize: fileSize
                });

                this.updateProgress(fileId, 100, fileSize, '已完成');
                this.addToHistory('sent', file.name, fileSize);
                this.showToast(`已发送: ${file.name}`, 'success');
            }
        };

        setTimeout(sendNext, 50);
    }

    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message) {
            this.showToast('请输入内容', 'error');
            return;
        }

        if (this.connections.length === 0 || !this.connections.some(c => c.open)) {
            this.showToast('未连接', 'error');
            return;
        }

        this.broadcast({
            type: 'message',
            content: message,
            senderName: this.nickname || '我',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        });

        this.addMessage(message, this.nickname || '我', 'sent', '刚刚');
        this.elements.messageInput.value = '';
    }

    addMessage(content, sender, type, time) {
        const msgObj = { content, sender, type, time };
        this.messages.unshift(msgObj);
        this.renderMessages();
    }

    renderMessages() {
        if (this.messages.length === 0) {
            this.elements.messagesList.innerHTML = '<p class="empty-tip">暂无消息</p>';
            return;
        }

        this.elements.messagesList.innerHTML = this.messages.map(msg => `
            <div class="message-item ${msg.type}">
                <div class="message-sender">${msg.sender} · ${msg.time}</div>
                <div class="message-content">${this.escapeHtml(msg.content)}</div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleData(data, conn = null) {
        if (data.type === 'file-meta') {
            this.receiveFileMeta(data);
        } else if (data.type === 'file-chunk') {
            this.receiveFileChunk(data);
        } else if (data.type === 'file-complete') {
            this.completeFileReceive(data);
        } else if (data.type === 'message') {
            this.receiveMessage(data);
        }
    }

    receiveFileMeta(data) {
        const { fileId, fileName, fileSize, totalChunks, senderName } = data;

        if (this.fileChunks[fileId]) {
            return;
        }

        this.fileChunks[fileId] = {
            fileName: fileName,
            fileSize: fileSize,
            totalChunks: totalChunks,
            chunks: {},
            receivedChunks: 0,
            autoStart: true
        };

        this.addProgressItem(fileId, fileName, fileSize);
        this.showToast(`收到文件: ${fileName}`, 'success');
    }

    receiveFileChunk(data) {
        const { fileId, chunk, chunkIndex, totalChunks } = data;

        if (!this.fileChunks[fileId]) {
            return;
        }

        const fileData = this.fileChunks[fileId];

        if (fileData.chunks[chunkIndex]) {
            return;
        }

        fileData.chunks[chunkIndex] = chunk;
        fileData.receivedChunks++;

        const progress = Math.round((fileData.receivedChunks / totalChunks) * 100);
        const bytesReceived = Math.min(fileData.receivedChunks * this.CHUNK_SIZE, fileData.fileSize);

        this.updateProgress(fileId, progress, bytesReceived);
    }

    receiveMessage(data) {
        const { content, senderName, time } = data;
        this.peerNickname = senderName;
        this.elements.peerNickname.textContent = senderName;
        this.addMessage(content, senderName, 'received', time);
    }

    completeFileReceive(data) {
        const fileId = data.fileId;
        const fileSize = data.fileSize;
        const fileData = this.fileChunks[fileId];

        if (!fileData) return;

        fileData.fileSize = fileSize;

        setTimeout(() => {
            const totalChunks = fileData.totalChunks || Math.ceil(fileSize / this.CHUNK_SIZE);

            if (fileData.receivedChunks >= totalChunks) {
                this.processReceivedChunk(fileId, 0);
            } else {
                setTimeout(() => {
                    this.processReceivedChunk(fileId, 0);
                }, 200);
            }
        }, 300);
    }

    processReceivedChunk(fileId, chunkIndex) {
        const fileData = this.fileChunks[fileId];
        if (!fileData) return;

        const totalChunks = Math.ceil(fileData.fileSize / this.CHUNK_SIZE);
        const chunks = [];

        for (let i = 0; i < totalChunks; i++) {
            if (fileData.chunks[i]) {
                chunks.push(fileData.chunks[i]);
            } else {
                return;
            }
        }

        const blob = new Blob(chunks, { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileData.fileName;
        link.click();

        URL.revokeObjectURL(url);

        this.updateProgress(fileId, 100, fileData.fileSize, '已下载');
        this.addToHistory('received', fileData.fileName, fileData.fileSize);
        this.showToast(`已下载: ${fileData.fileName}`, 'success');

        delete this.fileChunks[fileId];
    }

    addProgressItem(fileId, fileName, fileSize) {
        document.querySelector('.progress-section').classList.remove('hidden');

        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.id = 'progress-item-' + fileId;
        progressItem.innerHTML = `
            <div class="progress-header">
                <span class="progress-name" title="${fileName}">${fileName}</span>
                <span class="progress-status" id="progress-status-${fileId}">0%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="progress-bar-${fileId}" style="width: 0%"></div>
            </div>
            <div class="progress-details">
                <div>
                    <span id="progress-current-${fileId}">0 KB</span>
                    <span id="progress-total-${fileId}"> / ${this.formatFileSize(fileSize)}</span>
                </div>
                <div class="progress-info">
                    <span id="progress-speed-${fileId}" class="progress-speed"></span>
                    <span id="progress-time-${fileId}" class="progress-time"></span>
                </div>
            </div>
        `;
        this.elements.progressList.appendChild(progressItem);

        this.fileChunks[fileId] = {
            ...(this.fileChunks[fileId] || {}),
            startTime: Date.now(),
            lastBytes: 0,
            fileSize: fileSize
        };
    }

    updateProgress(fileId, percentage, currentSize, status = null) {
        const progressBar = document.getElementById('progress-bar-' + fileId);
        const progressStatus = document.getElementById('progress-status-' + fileId);
        const progressCurrent = document.getElementById('progress-current-' + fileId);
        const progressSpeed = document.getElementById('progress-speed-' + fileId);
        const progressTime = document.getElementById('progress-time-' + fileId);

        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        if (progressStatus) {
            progressStatus.textContent = status || percentage + '%';
        }
        if (progressCurrent) {
            progressCurrent.textContent = this.formatFileSize(currentSize);
        }

        const fileData = this.fileChunks[fileId];
        if (fileData && progressSpeed && progressTime) {
            const elapsed = (Date.now() - fileData.startTime) / 1000;
            const bytesDiff = currentSize - fileData.lastBytes;

            if (elapsed > 1 && bytesDiff > 0) {
                const speed = Math.round(bytesDiff / elapsed);
                progressSpeed.textContent = `${this.formatFileSize(speed)}/s`;

                const remainingBytes = fileData.fileSize - currentSize;
                const remainingTime = Math.round(remainingBytes / speed);
                progressTime.textContent = `约剩${this.formatTime(remainingTime)}`;
            }

            fileData.lastBytes = currentSize;
        }
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}秒`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
        } else {
            return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
        }
    }

    addToHistory(type, fileName, fileSize) {
        const historyItem = {
            type: type,
            fileName: fileName,
            fileSize: fileSize,
            time: new Date().toLocaleString('zh-CN')
        };

        this.transferHistory.unshift(historyItem);
        if (this.transferHistory.length > 20) {
            this.transferHistory.pop();
        }

        this.renderHistory();
    }

    renderHistory() {
        if (this.transferHistory.length === 0) {
            this.elements.transferHistory.innerHTML = '<div class="empty-tip">暂无记录</div>';
            return;
        }

        this.elements.transferHistory.innerHTML = this.transferHistory.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-type ${item.type}">${item.type === 'sent' ? '发送' : '接收'}</span>
                    <span class="history-name" title="${item.fileName}">${item.fileName}</span>
                </div>
                <span class="history-size">${this.formatFileSize(item.fileSize)}</span>
            </div>
        `).join('');
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📕', doc: '📘', docx: '📘',
            xls: '📗', xlsx: '📗',
            ppt: '📙', pptx: '📙',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
            mp3: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵',
            mp4: '🎬', avi: '🎬', mov: '🎬', mkv: '🎬', webm: '🎬',
            zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
            js: '📜', ts: '📜', py: '📜', java: '📜', c: '📜', cpp: '📜',
            html: '🌐', css: '🌐',
            json: '📋', xml: '📋',
            txt: '📄', md: '📄'
        };
        return icons[ext] || '📁';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    showToast(message, type = '') {
        this.elements.toast.textContent = message;
        this.elements.toast.className = 'toast ' + type;
        this.elements.toast.classList.remove('hidden');

        requestAnimationFrame(() => {
            this.elements.toast.classList.add('show');
        });

        setTimeout(() => {
            this.elements.toast.classList.remove('show');
            setTimeout(() => {
                this.elements.toast.classList.add('hidden');
            }, 400);
        }, 2800);
    }
}

const app = new FileTransferApp();
