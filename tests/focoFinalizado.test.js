const assert = require('node:assert');
const path = require('node:path');
const { createDomEnvironment } = require('./helpers/mockDom');

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

runTest('FocoFinalizado marca a tarefa selecionada como concluída e persiste no armazenamento', () => {
  const environment = createDomEnvironment();
  environment.applyGlobals();

  const scriptPath = path.join(__dirname, '..', 'script-crud.js');
  delete require.cache[require.resolve(scriptPath)];

  try {
    require(scriptPath);

    const { document, window } = environment;
    const textarea = document.querySelector('.app__form-textarea');
    textarea.value = 'Estudar testes automatizados';

    const form = document.querySelector('.app__form-add-task');
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    const taskItem = document.querySelector('.app__section-task-list-item');
    if (!taskItem) {
      throw new Error('A tarefa não foi criada após o envio do formulário');
    }

    taskItem.click();

    document.dispatchEvent(new window.CustomEvent('FocoFinalizado'));

    assert(
      taskItem.classList.contains('app__section-task-list-item-complete'),
      'A tarefa selecionada deve receber a classe de completa'
    );
    assert(
      !taskItem.classList.contains('app__section-task-list-item-active'),
      'A tarefa selecionada não deve permanecer com a classe de ativa após concluir'
    );

    const editButton = taskItem.querySelector('button');
    assert(editButton, 'O botão de edição precisa existir dentro da tarefa');
    assert.strictEqual(editButton.getAttribute('disabled'), 'disabled', 'O botão de edição deve ser desabilitado');

    const storedTasks = JSON.parse(window.localStorage.getItem('tarefas'));
    assert(Array.isArray(storedTasks), 'As tarefas persistidas precisam ser um array');
    assert.strictEqual(storedTasks.length, 1, 'Deve haver exatamente uma tarefa persistida');
    assert.strictEqual(storedTasks[0].descricao, 'Estudar testes automatizados');
    assert.strictEqual(storedTasks[0].completa, true, 'A tarefa persistida deve estar marcada como completa');
  } finally {
    environment.cleanup();
    delete require.cache[require.resolve(scriptPath)];
  }
});
