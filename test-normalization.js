// Script de teste para normalização de texto - questões de matemática

console.log('=== TESTE DE NORMALIZAÇÃO ===');

const normalizeText = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

// Exemplos de respostas que podem estar causando problema
const testCases = [
    { selected: '12', correct: '12' },
    { selected: ' 12 ', correct: '12' },
    { selected: '12', correct: ' 12 ' },
    { selected: 'A', correct: 'a' },
    { selected: 'a', correct: 'A' },
    { selected: '2x + 3', correct: '2x+3' },
    { selected: '2x+3', correct: '2x + 3' },
    { selected: '√16', correct: '√16' },
];

testCases.forEach((test, index) => {
    console.log(`Teste ${index + 1}:`);
    console.log(`  Selecionada: "${test.selected}"`);
    console.log(`  Correta: "${test.correct}"`);
    console.log(`  Estrita: ${test.selected === test.correct}`);
    console.log(`  Robusta: ${normalizeText(test.selected) === normalizeText(test.correct)}`);
    console.log(`  Bytes selecionada: [${Array.from(test.selected).map(c => c.charCodeAt(0)).join(', ')}]`);
    console.log(`  Bytes correta: [${Array.from(test.correct).map(c => c.charCodeAt(0)).join(', ')}]`);
    console.log('---');
});
