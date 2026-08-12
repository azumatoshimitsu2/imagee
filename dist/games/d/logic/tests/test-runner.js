export function createTestRunner(results) {
  function test(name, callback) {
    const item = document.createElement("li");

    try {
      callback();
      item.className = "pass";
      item.textContent = `✓ ${name}`;
    } catch (error) {
      item.className = "fail";
      item.textContent = `✗ ${name}: ${error.message}`;
      console.error(error);
    }

    results.append(item);
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  return {
    assert,
    test
  };
}

