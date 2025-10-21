# Online C Compiler Integration Options

## Overview
Integrating with an online C compiler would allow your visualizer to:
- **Execute real C code** and show actual runtime behavior
- **Capture variable values** during execution for visualization
- **Display real output** alongside the visualization
- **Debug runtime errors** with actual stack traces

---

## ✅ Recommended API Services

### 1. **Judge0 CE** (BEST OPTION)
**Website**: https://judge0.com  
**GitHub**: https://github.com/judge0/judge0

#### Why Judge0?
- ✅ **Open source** and self-hostable
- ✅ **Free tier** available (50 requests/day)
- ✅ Supports **60+ languages** including C, C++
- ✅ **Docker-based** sandbox for security
- ✅ **REST API** with simple integration
- ✅ **Real-time execution** with stdout/stderr capture
- ✅ Active community and documentation

#### Pricing:
- **Free**: 50 requests/day
- **Basic**: $10/month - 2,000 requests/day
- **Pro**: $50/month - 10,000 requests/day
- **Self-Hosted**: Free (unlimited)

#### API Example:
```javascript
// Submit code for execution
const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
        source_code: "# include <stdio.h>\nint main() { printf(\"Hello\"); return 0; }",
        language_id: 50, // C (GCC 9.2.0)
        stdin: "",
        expected_output: ""
    })
});

const { token } = await response.json();

// Get results
const result = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`);
const data = await result.json();
console.log(data.stdout); // "Hello"
```

---

### 2. **Piston** (Runner-up)
**Website**: https://github.com/engineer-man/piston  
**API**: https://emkc.org/api/v2/piston

#### Why Piston?
- ✅ **Completely free** and open source
- ✅ **No authentication** required
- ✅ Simple REST API
- ✅ Self-hostable with Docker
- ✅ Supports **50+ languages**

#### Limitations:
- ⚠️ Limited debugging features
- ⚠️ No official rate limits (use responsibly)
- ⚠️ Less documentation than Judge0

#### API Example:
```javascript
const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        language: 'c',
        version: '10.2.0',
        files: [{
            name: 'main.c',
            content: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }'
        }]
    })
});

const result = await response.json();
console.log(result.run.output); // "Hello"
```

---

### 3. **JDoodle Compiler API**
**Website**: https://www.jdoodle.com/compiler-api

#### Why JDoodle?
- ✅ **Easy integration** with simple API
- ✅ Supports **76+ languages**
- ✅ Good documentation
- ✅ **Free tier**: 200 requests/day

#### Limitations:
- ⚠️ Requires API key (not anonymous)
- ⚠️ Limited to 200 requests/day on free tier
- ⚠️ Paid plans start at $7/month (10,000 requests)

#### API Example:
```javascript
const response = await fetch('https://api.jdoodle.com/v1/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_SECRET',
        script: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }',
        language: 'c',
        versionIndex: '4'
    })
});

const result = await response.json();
console.log(result.output); // "Hello"
```

---

### 4. **Compiler Explorer (Godbolt)** API
**Website**: https://godbolt.org  
**API Docs**: https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md

#### Why Godbolt?
- ✅ **Free and unlimited**
- ✅ Shows **assembly output** (great for learning)
- ✅ Multiple compiler versions
- ✅ No API key required

#### Limitations:
- ⚠️ More complex API
- ⚠️ Primarily designed for viewing assembly, not execution
- ⚠️ Requires parsing JSON response format

#### API Example:
```javascript
const response = await fetch('https://godbolt.org/api/compiler/cg122/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        source: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }',
        options: {
            userArguments: '',
            executeParameters: { args: [], stdin: '' },
            compilerOptions: { executorRequest: true }
        }
    })
});
```

---

## 🎯 Recommended Implementation Strategy

### **Phase 1: Basic Integration (Judge0)**
1. Add "Run Code" button to visualizer
2. Submit code to Judge0 API
3. Display stdout/stderr in output panel
4. Show compilation errors if any

### **Phase 2: Enhanced Visualization**
1. **Instrumentation**: Automatically inject `printf` statements at key points
2. **Parse output**: Extract variable values during execution
3. **Synchronize**: Match execution output with visualization steps
4. **Debugger mode**: Step through code with actual values

### **Phase 3: Advanced Features**
1. **Variable tracking**: Show live variable values
2. **Memory visualization**: Display stack/heap changes
3. **Performance metrics**: Execution time, memory usage
4. **Test cases**: Run multiple inputs automatically

---

## 💻 Sample Implementation Code

### Add to `api/index.js` (Backend Route):
```javascript
// Add this route to handle compilation requests
if (path === '/api/compile') {
    return handleCompileRequest(req, res);
}

async function handleCompileRequest(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        const { code } = JSON.parse(body);
        
        try {
            // Use Judge0 API
            const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?wait=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Key': process.env.JUDGE0_API_KEY
                },
                body: JSON.stringify({
                    source_code: code,
                    language_id: 50, // C (GCC 9.2.0)
                    stdin: ''
                })
            });
            
            const result = await response.json();
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
```

### Add to `static/js/visualizer.js` (Frontend):
```javascript
async function executeCode() {
    const code = DOM.codeEditor.value;
    
    if (!code.trim()) {
        showNotification('Please enter C code to execute', 'warning');
        return;
    }
    
    showNotification('Compiling and executing code...', 'info');
    
    try {
        const response = await fetch('/api/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        
        if (result.status.id === 3) { // Success
            showExecutionResult(result.stdout, result.stderr, result.time, result.memory);
        } else if (result.status.id === 6) { // Compilation error
            showCompilationError(result.compile_output);
        } else {
            showExecutionError(result.stderr || result.message);
        }
    } catch (error) {
        console.error('[Execution] Error:', error);
        showNotification('Failed to execute code', 'error');
    }
}

function showExecutionResult(stdout, stderr, time, memory) {
    const outputPanel = document.createElement('div');
    outputPanel.className = 'bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mt-4';
    outputPanel.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-white">✅ Execution Successful</span>
            <span class="text-xs text-gray-400">⏱️ ${time}s | 💾 ${memory}KB</span>
        </div>
        <pre class="whitespace-pre-wrap">${escapeHtml(stdout)}</pre>
        ${stderr ? `<div class="text-yellow-400 mt-2">Warnings:\n${escapeHtml(stderr)}</div>` : ''}
    `;
    DOM.visualizationCanvas.insertBefore(outputPanel, DOM.visualizationCanvas.firstChild);
}
```

---

## 🔐 Security Considerations

### Judge0 Benefits:
1. **Sandboxed execution** in Docker containers
2. **Resource limits** (CPU time, memory)
3. **No network access** from executed code
4. **Isolated file system**

### Best Practices:
- ✅ **Never execute user code directly** on your server
- ✅ Use **rate limiting** to prevent abuse
- ✅ **Validate input** before sending to API
- ✅ **Hide API keys** in environment variables
- ✅ **Monitor usage** to detect anomalies

---

## 💰 Cost Estimation

### For Small Projects (< 100 users/day):
- **Judge0 Free Tier**: $0/month (50 requests/day)
- **Piston**: $0/month (unlimited, self-hosted or public API)

### For Medium Projects (< 1000 users/day):
- **Judge0 Basic**: $10/month (2,000 requests/day)
- **Self-Hosted Judge0**: $5-10/month (VPS cost)

### For Large Projects (> 1000 users/day):
- **Judge0 Pro**: $50/month (10,000 requests/day)
- **Self-Hosted with Load Balancer**: $50-100/month

---

## 🚀 Quick Start Steps

### 1. Sign up for Judge0
```bash
# Visit https://rapidapi.com/judge0-official/api/judge0-ce
# Click "Subscribe to Test" → Choose Free plan
# Get your API key
```

### 2. Add Environment Variable
```bash
# In Vercel dashboard → Settings → Environment Variables
JUDGE0_API_KEY=your_api_key_here
```

### 3. Update Code (as shown in implementation section above)

### 4. Test Locally
```bash
# Set environment variable
$env:JUDGE0_API_KEY="your_key"; npm run dev

# Or in .env file
JUDGE0_API_KEY=your_key_here
```

### 5. Deploy to Vercel
```bash
git add .
git commit -m "feat: Add online C compiler integration via Judge0"
git push origin main
```

---

## 🎓 Learning Resources

- **Judge0 Documentation**: https://ce.judge0.com/
- **Piston GitHub**: https://github.com/engineer-man/piston
- **JDoodle API Docs**: https://docs.jdoodle.com/
- **Godbolt API**: https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md

---

## ✅ Summary

**Best Choice for Your Project**: **Judge0** or **Piston**

**Why?**
- Free tier sufficient for learning projects
- Easy REST API integration
- Secure sandboxed execution
- Good documentation and community support
- Can upgrade as your project grows

**Next Steps**:
1. Choose Judge0 for better features or Piston for 100% free
2. Sign up and get API credentials
3. Implement backend route in `api/index.js`
4. Add "Run Code" button and output panel to frontend
5. Test with example C programs
6. Deploy to Vercel

Would you like me to implement the Judge0 integration right now? 🚀
