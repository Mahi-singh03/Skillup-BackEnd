function totalMarks(examResults, subjects) {
    return examResults.reduce((sum, result) => {
      if (subjects.includes(result.subjectCode)) {
        return sum + (result.theoryMarks || 0) + (result.practicalMarks || 0);
      }
      return sum;
    }, 0);
  }
  
  function calculatePercentage(obtained, max) {
    return ((obtained / max) * 100).toFixed(2);
  }
  
  function convertToWords(number) {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    return units[number] || number;
  }
  
  module.exports = { totalMarks, calculatePercentage, convertToWords };