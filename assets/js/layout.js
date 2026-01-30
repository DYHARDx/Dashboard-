import { checkAuth } from './firebase-config.js';

export function loadSidebar() {
    const sidebar = document.getElementById('sidebarContainer');
    if (!sidebar) return;

    // SaaS Protection: Redirect if not logged in
    checkAuth((user, profile) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const role = profile ? profile.role : 'affiliate';
        renderSidebar(sidebar, role);
    });
}

function renderSidebar(sidebar, role) {
    const currentPath = window.location.pathname.split('/').pop() || (role === 'admin' ? 'dashboard.html' : 'affiliate_dashboard.html');

    let menuItems = [];

    if (role === 'admin') {
        menuItems = [
            { name: 'Dashboard', link: 'dashboard.html', icon: 'fa-grid-2' },
            { name: 'Offers', link: 'offers.html', icon: 'fa-gift' },
            { name: 'Affiliates', link: 'affiliates.html', icon: 'fa-users' },
            { name: 'Aff-Pending', link: 'affiliates_pending.html', icon: 'fa-user-clock' },
            { name: 'Payment', link: 'invoices.html', icon: 'fa-file-invoice-dollar' },
            { name: 'Offer Approval', link: 'offer_approval.html', icon: 'fa-check-double' },
            { name: 'Advertisers', link: 'advertisers.html', icon: 'fa-briefcase' },
            { name: 'Postback', link: 'postback.html', icon: 'fa-server' },
            { name: 'Ip Whitelist', link: 'ip_whitelist.html', icon: 'fa-shield-halved' },
            { name: 'Trash', link: 'trash.html', icon: 'fa-trash' },
            { name: 'Conversion Logs', link: 'conversion_logs.html', icon: 'fa-list' },
            { name: 'Settings', link: 'settings.html', icon: 'fa-gear' },
            { name: 'Log-Out', link: '#', icon: 'fa-right-from-bracket', textClass: 'text-danger', id: 'logoutBtn' }
        ];
    } else {
        // Affiliate Menu
        menuItems = [
            { name: 'Dashboard', link: 'affiliate_dashboard.html', icon: 'fa-grid-2' },
            { name: 'Browse Offers', link: 'affiliate_offers.html', icon: 'fa-gift' },
            { name: 'My Performance', link: 'affiliate_reports.html', icon: 'fa-chart-line' },
            { name: 'Payments', link: 'affiliate_payments.html', icon: 'fa-wallet' },
            { name: 'Postback Setup', link: 'affiliate_postback.html', icon: 'fa-link' },
            { name: 'Profile Settings', link: 'affiliate_settings.html', icon: 'fa-user-gear' },
            { name: 'Log-Out', link: '#', icon: 'fa-right-from-bracket', textClass: 'text-danger', id: 'logoutBtn' }
        ];
    }

    sidebar.innerHTML = `
        <div class="logo">
            <div style="width:36px; height:36px; background:linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 15px rgba(109,40,217,0.4);">
                <i class="fa-solid fa-bolt" style="color:white; font-size:18px; filter:none; margin:0;"></i>
            </div>
            <span style="font-weight:800; letter-spacing:-0.5px;">DYHARD<span style="color:var(--primary);">PANEL</span></span>
        </div>
        <nav style="flex:1;">
            <ul>
                ${menuItems.map(item => `
                    <li>
                        <a href="${item.link}" ${item.id ? `id="${item.id}"` : ''} class="nav-item ${currentPath === item.link ? 'active' : ''} ${item.textClass || ''}">
                            <i class="fa-solid ${item.icon}"></i> ${item.name}
                        </a>
                    </li>
                `).join('')}
            </ul>
        </nav>
        <div class="p-4 border-t border-color text-xs text-muted">
            v1.0.2 - ${role.charAt(0).toUpperCase() + role.slice(1)}
        </div>
    `;

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const { logoutUser } = await import('./firebase-config.js');
            try {
                await logoutUser();
            } catch (err) { console.error(err); }
            window.location.href = 'index.html';
        });
    }
}
