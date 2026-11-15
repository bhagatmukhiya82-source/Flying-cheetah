const leadsHandler = require('../api/leads');
const demosHandler = require('../api/demos');
const { invokeHandler } = require('./e2e/helpers');

async function run() {
    console.log('=== TEST SUITE 1: HONEYPOT BOT TRAPPING ===');
    
    // 1.1 Leads with website_url
    const resLeadBot1 = await invokeHandler(leadsHandler, {
        method: 'POST',
        body: { name: 'Spam Bot', email: 'bot@spam.com', phone: '1234567890', website_url: 'http://spam.org' }
    });
    console.log('1.1 Lead Bot (website_url): status =', resLeadBot1.statusCode, 'body =', JSON.stringify(resLeadBot1.json));

    // 1.2 Leads with honeypot
    const resLeadBot2 = await invokeHandler(leadsHandler, {
        method: 'POST',
        body: { name: 'Spam Bot 2', email: 'bot2@spam.com', phone: '1234567890', honeypot: 'bot_trap' }
    });
    console.log('1.2 Lead Bot (honeypot): status =', resLeadBot2.statusCode, 'body =', JSON.stringify(resLeadBot2.json));

    // 1.3 Leads with empty website_url (human submission)
    const resLeadHuman = await invokeHandler(leadsHandler, {
        method: 'POST',
        body: { name: 'Human Prospect', email: 'human_' + Date.now() + '@example.com', phone: '9998887776', website_url: '' }
    });
    console.log('1.3 Lead Human (empty website_url): status =', resLeadHuman.statusCode, 'id =', resLeadHuman.json?.id);

    // 1.4 Demos with company_url
    const resDemoBot1 = await invokeHandler(demosHandler, {
        method: 'POST',
        body: { name: 'Demo Bot', email: 'demobot@spam.com', phone: '1234567890', company_url: 'http://spam.org' }
    });
    console.log('1.4 Demo Bot (company_url): status =', resDemoBot1.statusCode, 'body =', JSON.stringify(resDemoBot1.json));

    // 1.5 Demos with honeypot
    const resDemoBot2 = await invokeHandler(demosHandler, {
        method: 'POST',
        body: { name: 'Demo Bot 2', email: 'demobot2@spam.com', phone: '1234567890', honeypot: 'bot_trap' }
    });
    console.log('1.5 Demo Bot (honeypot): status =', resDemoBot2.statusCode, 'body =', JSON.stringify(resDemoBot2.json));

    // 1.6 Demos with empty company_url (human submission)
    const resDemoHuman = await invokeHandler(demosHandler, {
        method: 'POST',
        body: { name: 'Human Demo Prospect', email: 'demo_human_' + Date.now() + '@example.com', phone: '9998887776', company_url: '' }
    });
    console.log('1.6 Demo Human (empty company_url): status =', resDemoHuman.statusCode, 'id =', resDemoHuman.json?.id);

    console.log('\n=== TEST SUITE 2: WHITESPACE VALIDATION ===');
    const whitespaceCases = [
        { label: 'all spaces', name: '   ', email: '   ', phone: '   ' },
        { label: 'tabs and newlines', name: '\t\n', email: '\n\t', phone: '\t' },
        { label: 'empty name only', name: '   ', email: 'valid@example.com', phone: '1234567890' },
        { label: 'empty email only', name: 'Valid Name', email: '   ', phone: '1234567890' },
        { label: 'empty phone only', name: 'Valid Name', email: 'valid@example.com', phone: '   ' }
    ];

    for (const c of whitespaceCases) {
        const leadRes = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { name: c.name, email: c.email, phone: c.phone }
        });
        console.log(`2.1 Leads [${c.label}]: status = ${leadRes.statusCode}, error = "${leadRes.json?.error}"`);

        const demoRes = await invokeHandler(demosHandler, {
            method: 'POST',
            body: { name: c.name, email: c.email, phone: c.phone }
        });
        console.log(`2.2 Demos [${c.label}]: status = ${demoRes.statusCode}, error = "${demoRes.json?.error}"`);
    }

    console.log('\n=== TEST SUITE 3: WHITESPACE TRIMMING ON LEGITIMATE INPUTS ===');
    const legitLead = await invokeHandler(leadsHandler, {
        method: 'POST',
        body: {
            name: '   Padded Lead Name   ',
            email: '   PADDED_LEAD_' + Date.now() + '@EXAMPLE.COM   ',
            phone: '   +91 9876543210   ',
            message: '   Need CRM integration   ',
            service: 'CRM Automation'
        }
    });
    console.log('3.1 Trimmed Lead status =', legitLead.statusCode);
    console.log('    id =', legitLead.json?.id);
    console.log('    name =', JSON.stringify(legitLead.json?.name));
    console.log('    email =', JSON.stringify(legitLead.json?.email));
    console.log('    phone =', JSON.stringify(legitLead.json?.phone));
    console.log('    service =', JSON.stringify(legitLead.json?.service));
    console.log('    service_interested =', JSON.stringify(legitLead.json?.service_interested));

    const legitDemo = await invokeHandler(demosHandler, {
        method: 'POST',
        body: {
            name: '   Padded Demo Name   ',
            email: '   PADDED_DEMO_' + Date.now() + '@EXAMPLE.COM   ',
            phone: '   +91 9876543210   ',
            company: '   Acme Logistics   ',
            notes: '   Interested in Borzo integration   '
        }
    });
    console.log('3.2 Trimmed Demo status =', legitDemo.statusCode);
    console.log('    id =', legitDemo.json?.id);
    console.log('    name =', JSON.stringify(legitDemo.json?.name));
    console.log('    email =', JSON.stringify(legitDemo.json?.email));
    console.log('    phone =', JSON.stringify(legitDemo.json?.phone));
    console.log('    company =', JSON.stringify(legitDemo.json?.company));
    console.log('    notes =', JSON.stringify(legitDemo.json?.notes));
}

run().catch(err => {
    console.error('Fatal in test execution:', err);
    process.exit(1);
});
