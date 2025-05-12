function createDemoIndicator() {
    const demoDiv = document.createElement('div');
    demoDiv.style.position = 'fixed';
    demoDiv.style.bottom = '10px';
    demoDiv.style.left = '10px';
    demoDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.85)';
    demoDiv.style.color = 'white';
    demoDiv.style.padding = '8px 15px';
    demoDiv.style.borderRadius = '4px';
    demoDiv.style.zIndex = '9999';
    demoDiv.style.fontSize = '14px';
    demoDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    demoDiv.innerHTML = '<strong>DEMO MODE</strong> - Using mock data';

    document.body.appendChild(demoDiv);
}

document.addEventListener('DOMContentLoaded', createDemoIndicator);

export { createDemoIndicator };
