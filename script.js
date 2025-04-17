document.getElementById('generatePm2').addEventListener('change', function () {
	document.getElementById('portGroup').style.display = this.checked
		? 'block'
		: 'none';
});

function generateScripts() {
	const appName = document.getElementById('appName').value.trim();
	const rootPath = document.getElementById('rootPath').value.trim();
	const serverNames = document.getElementById('serverNames').value.trim();
	const generateNginx = document.getElementById('generateNginx').checked;
	const generatePm2 = document.getElementById('generatePm2').checked;
	const generateHttps = document.getElementById('generateHttps')?.checked;
	const port = generatePm2
		? document.getElementById('port').value.trim()
		: '3000';
	const errorMessage = document.getElementById('errorMessage');

	errorMessage.style.display = 'none';
	errorMessage.textContent = '';

	if (!appName || !rootPath) {
		showError('Please fill in App Name and Root Folder Path');
		return;
	}

	if (generatePm2 && (!port || isNaN(port) || port < 1024 || port > 65535)) {
		showError('Please enter a valid port number (1024-65535)');
		return;
	}

	if (generateNginx && !serverNames) {
		showError('Please provide server names for Nginx config');
		return;
	}

	if (generateNginx) {
		const nginxConfig = generatePm2
			? generateNextjsNginxConfig(
					appName,
					rootPath,
					serverNames,
					port,
					generateHttps
			  )
			: generateLaravelNginxConfig(
					appName,
					rootPath,
					serverNames,
					generateHttps
			  );
		document.getElementById('nginxConfig').value = nginxConfig;
		document.getElementById('nginxResult').style.display = 'block';
	} else {
		document.getElementById('nginxResult').style.display = 'none';
	}

	if (generatePm2) {
		const pm2Script = generatePm2Script(appName, rootPath, port);
		document.getElementById('pm2Script').value = pm2Script;
		document.getElementById('pm2Result').style.display = 'block';
	} else {
		document.getElementById('pm2Result').style.display = 'none';
	}
}

function showError(message) {
	const errorMessage = document.getElementById('errorMessage');
	errorMessage.textContent = message;
	errorMessage.style.display = 'block';
}

function generateNextjsNginxConfig(
    appName,
    rootPath,
    serverNames,
    port,
    useHttps = false
) {
    const domainList = serverNames.trim();
    const primaryDomain = domainList.split(' ')[0];

    const httpsRedirectBlock = useHttps
        ? `
server {
    listen 80;
    server_name ${domainList};
    return 301 https://$host$request_uri;
}
        `
        : '';

    const listenBlock = useHttps
        ? `
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/${primaryDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${primaryDomain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_dhparam /etc/ssl/certs/dhparam.pem;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
        `
        : `
    listen 80;
    listen [::]:80;
`;

    return `${httpsRedirectBlock}
server {
    ${listenBlock}
    server_name ${domainList};
    root ${rootPath};

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_proxied any;

    # Handle proxying to Next.js app
    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings for proxy
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        send_timeout 60s;
    }

    # Static file handling for Next.js
    location /_next/static/ {
        alias ${rootPath}/.next/static/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    location /static/ {
        alias ${rootPath}/public/static/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    location /_next/image/ {
        proxy_pass http://localhost:${port}/_next/image/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Error pages
    error_page 500 502 503 504 /500.html;
    error_page 404 /404.html;
    location = /500.html { internal; }
    location = /404.html { internal; }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Security: Deny access to sensitive files
    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* (\\.env|\\.git|\\.svn|\\.hg) {
        deny all;
        access_log off;
        log_not_found off;
    }

    # File upload limit (adjust as needed)
    client_max_body_size 100M;  # Max upload size set to 100MB

    # Timeout settings for better performance
    client_body_timeout 60s;     # Timeout for receiving the client body
    client_header_timeout 60s;   # Timeout for receiving the client header
    keepalive_timeout 65s;       # Timeout for keep-alive connections
    send_timeout 60s;            # Timeout for sending response to client

    # Enable HTTP/2 for better performance (optional)
    # listen 443 ssl http2;
}`;
}


function generateLaravelNginxConfig(
    appName,
    rootPath,
    serverNames,
    useHttps = false
) {
    const primaryDomain = serverNames.split(' ')[0];

    const httpsRedirectBlock = useHttps
        ? `
server {
    listen 80;
    server_name ${serverNames};
    return 301 https://$host$request_uri;
}
        `
        : '';

    const protocolBlock = useHttps
        ? `
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/${primaryDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${primaryDomain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_dhparam /etc/ssl/certs/dhparam.pem;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
        `
        : `
    listen 80;
    listen [::]:80;
`;

    return `${httpsRedirectBlock}
server {
    ${protocolBlock}
    server_name ${serverNames};
    root ${rootPath}/public;

    index index.php index.html index.htm;

    # Compression settings for better performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_proxied any;

    # Laravel-specific optimizations
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP handling for Laravel
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;  # Adjust to your PHP-FPM version/socket
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    # Handle .htaccess-like configurations for Laravel
    location ~ /\. {
        deny all;
    }

    # Handle error pages
    error_page 404 /index.php;
    error_page 500 502 503 504 /500.html;
    location = /500.html {
        internal;
    }

    # Prevent access to sensitive files
    location ~* (\\.env|\\.git|\\.svn|\\.hg) {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Set security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cache control for static assets (adjust expiration as needed)
    location ~* \.(?:css|js|jpg|jpeg|png|gif|ico|woff|woff2|ttf|svg|eot)$ {
        try_files \$uri =404;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Handle Laravel public storage folder for direct access
    location /storage/ {
        try_files \$uri \$uri/ =404;
    }

    # Increase file upload limit (adjust as per your requirement)
    client_max_body_size 100M;  # Max upload size set to 100MB

    # Timeout settings for better performance
    client_body_timeout 60s;     # Timeout for receiving the client body
    client_header_timeout 60s;   # Timeout for receiving the client header
    keepalive_timeout 65s;       # Timeout for keep-alive connections
    send_timeout 60s;            # Timeout for sending response to client

    # Logging configuration (optional, for better observability)
    access_log /var/log/nginx/${appName}_access.log;
    error_log /var/log/nginx/${appName}_error.log;

    # Enable HTTP/2 for better performance (optional)
    # listen 443 ssl http2;
}`;
}


function generatePm2Script(appName, rootPath, port) {
	return `#!/bin/bash
set -eu

APP_DIR="${rootPath}"
cd "$APP_DIR"

echo ">>> Loading environment from: $APP_DIR"

if [ -f ".env" ]; then
    export $(grep -E '^(NEXT_APP_NAME|PORT)=' .env | xargs)
fi

# Use provided port if not set in .env
PORT=${port}

echo ">>> Stopping Next.js app: ${appName} on port $PORT..."

if command -v pm2 &> /dev/null; then
    pm2 delete "${appName}" 2>/dev/null || true
else
    kill $(lsof -t -i:$PORT) 2>/dev/null || true
fi

echo ">>> Cleaning previous build..."
rm -rf "$APP_DIR/.next"

echo ">>> Installing dependencies..."
npm install --force

echo ">>> Building Next.js app..."
npm run build

echo ">>> Starting Next.js app on port $PORT..."

if command -v pm2 &> /dev/null; then
    echo ">>> Using PM2 for process management"
    pm2 start npm --name "${appName}" -- start -- -p $PORT
    pm2 save
    pm2 startup 2>/dev/null
else
    echo ">>> PM2 not found, starting directly"
    nohup npm start -p $PORT > nextjs.log 2>&1 &
fi

echo ">>> ✅ App rebuild complete!"

if command -v pm2 &> /dev/null; then
    pm2 list
fi
`;
}

async function copyToClipboard(elementId) {
	const textarea = document.getElementById(elementId);
	try {
		await navigator.clipboard.writeText(textarea.value);
		showError('Copied to clipboard!', true);
	} catch (err) {
		showError('Failed to copy to clipboard. Please try again.');
	}
}
