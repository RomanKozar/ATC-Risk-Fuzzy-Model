let numControllers = 5

// Generate fatigue data table
function generateFatigueTable() {
	numControllers = parseInt(document.getElementById('numControllers').value)
	let html = '<table class="fatigue-table"><thead><tr><th>Час</th>'

	for (let i = 1; i <= numControllers; i++) {
		html += `<th>a${i}</th>`
	}
	html += '</tr></thead><tbody>'

	for (let t = 1; t <= 8; t++) {
		html += `<tr><td><strong>t${t}</strong></td>`
		for (let i = 1; i <= numControllers; i++) {
			// Generate random value between 0.45 and 0.95
			const randomValue = (Math.random() * 0.5 + 0.45).toFixed(2)
			html += `<td><input type="number" id="v_${i}_${t}" min="0" max="1" step="0.01" value="${randomValue}"></td>`
		}
		html += '</tr>'
	}
	html += '</tbody></table>'

	document.getElementById('fatigueTableContainer').innerHTML = html
	generateMentalTable()
}

// Generate mental health criteria table
function generateMentalTable() {
	let html =
		'<table class="mental-table" style="margin-top: 20px;"><thead><tr><th>Критерій</th>'

	for (let i = 1; i <= numControllers; i++) {
		html += `<th>a${i}</th>`
	}
	html += '</tr></thead><tbody>'

	const criteria = ['K₁', 'K₂', 'K₃', 'K₄', 'K₅', 'K₆', 'K₇', 'K₈']
	for (let k = 0; k < 8; k++) {
		html += `<tr><td><strong>${criteria[k]}</strong></td>`
		for (let i = 1; i <= numControllers; i++) {
			// Generate random value between 1 and 8
			const randomValue = Math.floor(Math.random() * 8) + 1
			html += `<td><input type="number" id="k_${i}_${
				k + 1
			}" min="1" max="10" step="1" value="${randomValue}"></td>`
		}
		html += '</tr>'
	}
	html += '</tbody></table>'

	document.getElementById('mentalTableContainer').innerHTML = html
}

// Calculate fa(a_i) - average fatigue
function calculateFatigue(controllerId) {
	let sum = 0
	for (let t = 1; t <= 8; t++) {
		const value =
			parseFloat(document.getElementById(`v_${controllerId}_${t}`).value) || 0
		sum += value
	}
	return sum / 8
}

// Calculate l(a_i) - sum of criteria scores
function calculateMentalSum(controllerId) {
	let sum = 0
	for (let k = 1; k <= 8; k++) {
		const value =
			parseInt(document.getElementById(`k_${controllerId}_${k}`).value) || 0
		sum += value
	}
	return sum
}

// Z-spline fuzzification for mental health (formula 4)
function zSplineFuzzification(l) {
	if (l <= 10) return 1
	if (l > 10 && l <= 40) {
		return 1 - 2 * Math.pow((l - 10) / 60, 2)
	}
	if (l > 40 && l < 70) {
		return 2 * Math.pow((70 - l) / 60, 2)
	}
	return 0
}

// Get linguistic mental health level
function getMentalHealthLevel(lambda) {
	if (lambda > 0.8) return { level: 'L₁', description: 'Високий рівень' }
	if (lambda > 0.6) return { level: 'L₂', description: 'Стабільний рівень' }
	if (lambda > 0.4) return { level: 'L₃', description: 'Помірний рівень' }
	if (lambda > 0.2) return { level: 'L₄', description: 'Критичний рівень' }
	return { level: 'L₅', description: 'Небезпечний рівень' }
}

// S-shaped membership function for risk calculation (formulas 5-9)
function calculateRiskValue(fa, mentalLevel) {
	const level = mentalLevel.level

	if (level === 'L₁') {
		if (fa >= 0 && fa <= 0.5) {
			return 1 / (1 + Math.pow(fa / 2, 2) + 4)
		} else {
			return 1 - 1 / (1 + Math.pow((1 - fa) / 2, 2))
		}
	}

	if (level === 'L₂') {
		if (fa >= 0 && fa <= 0.5) {
			return 1 / (1 + Math.pow(fa / 2, 2) + 3)
		} else {
			return 1 / (1 + (4 - Math.pow((1 - fa) / 2, 2)))
		}
	}

	if (level === 'L₃') {
		if (fa >= 0 && fa <= 0.5) {
			return 1 / (1 + Math.pow(fa / 2, 2) + 2)
		} else {
			return 1 / (1 + (3 - Math.pow((1 - fa) / 2, 2)))
		}
	}

	if (level === 'L₄') {
		if (fa >= 0 && fa <= 0.5) {
			return 1 / (1 + Math.pow(fa / 2, 2) + 1)
		} else {
			return 1 / (1 + (2 - Math.pow((1 - fa) / 2, 2)))
		}
	}

	if (level === 'L₅') {
		if (fa >= 0 && fa <= 0.5) {
			return 1 / (1 + Math.pow(fa / 2, 2))
		} else {
			return 1 / (1 + (1 - Math.pow((1 - fa) / 2, 2)))
		}
	}

	return 0.5
}

// Get linguistic risk level
function getRiskLevel(r) {
	if (r > 0.8)
		return {
			level: 'R₁',
			description: 'Низький рівень ризику',
			class: 'risk-low',
		}
	if (r > 0.6)
		return {
			level: 'R₂',
			description: 'Помірний рівень ризику',
			class: 'risk-moderate',
		}
	if (r > 0.4)
		return {
			level: 'R₃',
			description: 'Середній рівень ризику',
			class: 'risk-medium',
		}
	if (r > 0.2)
		return {
			level: 'R₄',
			description: 'Високий рівень ризику',
			class: 'risk-high',
		}
	return {
		level: 'R₅',
		description: 'Критичний рівень ризику',
		class: 'risk-critical',
	}
}

// Main calculation function
function calculateRisk() {
	let results = []

	for (let i = 1; i <= numControllers; i++) {
		const fa = calculateFatigue(i)
		const l = calculateMentalSum(i)
		const lambda = zSplineFuzzification(l)
		const mentalLevel = getMentalHealthLevel(lambda)
		const r = calculateRiskValue(fa, mentalLevel)
		const riskLevel = getRiskLevel(r)

		results.push({
			id: i,
			fa: fa.toFixed(3),
			l: l,
			lambda: lambda.toFixed(3),
			mentalLevel: mentalLevel,
			r: r.toFixed(3),
			riskLevel: riskLevel,
		})
	}

	displayResults(results)
}

// Display results
function displayResults(results) {
	let html = ''

	results.forEach(result => {
		const faHeight = Math.max(parseFloat(result.fa) * 140, 5)
		const lambdaHeight = Math.max(parseFloat(result.lambda) * 140, 5)
		const rHeight = Math.max(parseFloat(result.r) * 140, 5)

		html += `
            <div class="controller-result">
                <h3>Авіадиспетчер a${result.id}</h3>
                <div class="result-item">
                    <span class="result-label">Загальна оцінка втомленості fa(a${result.id}):</span>
                    <span class="result-value">${result.fa}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Сума балів l(a${result.id}):</span>
                    <span class="result-value">${result.l}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Оцінка ментального здоров'я λ_MH(a${result.id}):</span>
                    <span class="result-value">${result.lambda}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Рівень ментального здоров'я:</span>
                    <span class="result-value"><strong>${result.mentalLevel.level}</strong> - ${result.mentalLevel.description}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Кількісна оцінка ризику r(a${result.id}):</span>
                    <span class="result-value">${result.r}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Рівень ризику:</span>
                    <span class="result-value ${result.riskLevel.class}"><strong>${result.riskLevel.level}</strong> - ${result.riskLevel.description}</span>
                </div>
                <div class="chart-container">
                    <div class="chart-title">📊 Графік показників</div>
                    <div class="bar-chart">
                        <div class="bar-item">
                            <div class="bar" style="height: ${faHeight}px">
                                <div class="bar-value">${result.fa}</div>
                            </div>
                            <div class="bar-label">Втома</div>
                        </div>
                        <div class="bar-item">
                            <div class="bar" style="height: ${lambdaHeight}px">
                                <div class="bar-value">${result.lambda}</div>
                            </div>
                            <div class="bar-label">Мент. здоров'я</div>
                        </div>
                        <div class="bar-item">
                            <div class="bar" style="height: ${rHeight}px">
                                <div class="bar-value">${result.r}</div>
                            </div>
                            <div class="bar-label">Ризик</div>
                        </div>
                    </div>
                </div>
            </div>
        `
	})

	document.getElementById('resultsContainer').innerHTML = html
	document.getElementById('resultsSection').style.display = 'block'
	document
		.getElementById('resultsSection')
		.scrollIntoView({ behavior: 'smooth' })
}

// Clear all data
function clearData() {
	if (confirm('Ви впевнені, що хочете очистити всі дані?')) {
		generateFatigueTable()
		document.getElementById('resultsSection').style.display = 'none'
	}
}

// Initialize on page load
window.onload = function () {
	generateFatigueTable()
}
