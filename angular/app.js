/**
 * Created by raduy on 04.05.14.
 */
'use strict';

var chebi = angular.module('chebi', []);

chebi.controller('InputController', ['$scope', function ($scope) {
    $scope.hello = "world";

    function thirdDegreeFunction(x) {
        return 3 * x * x * x + 6 * x * x + x + 9;
    }

    function signum(x) {
        return (x > 0 ? (x < 0 ? 1 : 0) : -1);
    }

    function square(x) {
        return x * x;
    }

    function absoluteValue(x) {
        return x > 0 ? x : -x
    }

    function squareInverse(x) {
        return 1 / (25 * x * x + 1);
    }

    $scope.input = {
        numberOfKnots: 10,
        degree: 2,
        baseFunctions: [
            {name: 'square', impl: square},
            {name: 'step function', impl: Math.floor},
            {name: 'third deg. function', impl: thirdDegreeFunction},
            {name: 'signum', impl: signum},
            {name: 'sinus', impl: Math.sin},
            {name: 'absolute value', impl: absoluteValue},
            {name: 'inverse of square function', impl: squareInverse}
        ],
        baseFunction: {name: 'step function', impl: Math.floor},
        leftInterval: -10,
        rightInterval: 10
    };

    $scope.incrementNumberOfKnots = function () {
        if ($scope.input.numberOfKnots < 80) {
            $scope.input.numberOfKnots++;
        }
    };

    $scope.decrementNumberOfKnots = function () {
        if ($scope.input.numberOfKnots > 0) {
            $scope.input.numberOfKnots--;
        }
    };

    $scope.incrementDegree = function () {
        if ($scope.input.degree < 30) {
            $scope.input.degree++;
        }
    };

    $scope.decrementDegree = function () {
        if ($scope.input.degree > 0) {
            $scope.input.degree--;
        }
    };

    $scope.setBaseFunction = function (baseFun) {
        $scope.input.baseFunction = baseFun;
    };

    var valuePolynomialsChebyshev = function (degree, x) {
        if (degree === 0) {
            return 1;
        }
        else if (degree === 1) {
            return x;
        }
        return 2 * x * valuePolynomialsChebyshev(degree - 1, x) - valuePolynomialsChebyshev(degree - 2, x);
    };

    var computeValuesOfBaseFunction = function (arrayOfKnots, fun) {
        var result = new Array(arrayOfKnots.length);
        for (var i = 0; i < arrayOfKnots.length; i++) {
            result[i] = fun(arrayOfKnots[i]);
        }
        return result;
    };

    var computeZeroPoint = function (numberOfPoints, numberOfKnots) {
        return -Math.cos((2 * numberOfKnots - 1) / (2 * numberOfPoints) * Math.PI);
    };

    var computeArrayOfZeroPoints = function (numberOfPoints) {
        var result = [];
        for (var i = 1; i <= numberOfPoints; i++) {
            result.push(computeZeroPoint(numberOfPoints, i));
        }
        return result;
    };

    var adjustNodesToInterval = function (zeros, left, right) {
        var result = new Array(zeros.length);
        for (var i = 0; i < zeros.length; i++) {
            result[i] = (zeros[i] + 1) * (right - left) / 2 + left;
        }
        return result;
    };

    var computeChebyshevCoefficients = function (degree, numberOfPoints, arrayOfKnots, arrayOfValues) {
        var arrayOfCoefficients = [];
        var numerator, denominator, chebyshevPolynomialValue;
        for (var i = 0; i <= degree; i++) {
            numerator = 0;
            denominator = 0;
            for (var j = 0; j < numberOfPoints; j++) {
                chebyshevPolynomialValue = valuePolynomialsChebyshev(i, arrayOfKnots[j]);

                numerator += arrayOfValues[j] * chebyshevPolynomialValue;
                denominator += chebyshevPolynomialValue * chebyshevPolynomialValue;
            }

            arrayOfCoefficients.push(numerator / denominator);
        }
        return arrayOfCoefficients;
    };

    var computeApproxFunctionValue = function (degree, x, arrayOfCoefficients) {
        var value = 0;
        for (var i = 0; i <= degree; i++) {
            value += arrayOfCoefficients[i] * valuePolynomialsChebyshev(i,
                (2 * (x - $scope.input.leftInterval) / ($scope.input.rightInterval - $scope.input.leftInterval) - 1));
        }
        return value;
    };

    var createArrayForD3 = function (degree, arrayOfCoefficients) {
        var array = [];
        for (var i = $scope.input.leftInterval; i < $scope.input.rightInterval; i += 0.1) {
            array.push({x: i, y: computeApproxFunctionValue(degree, i, arrayOfCoefficients)});
        }

        return array;
    };

    /* function to approximate */
    var functionToApprox = function (x) {
        return $scope.input.baseFunction.impl(x);
    };

    var doTheApproximation = function (numberOfPoints, degree) {
        var baseIntervalZeroPoints = computeArrayOfZeroPoints(numberOfPoints);
        var zeroPoints = adjustNodesToInterval(baseIntervalZeroPoints, $scope.input.leftInterval, $scope.input.rightInterval);
        var baseFunPoints = computeValuesOfBaseFunction(zeroPoints, functionToApprox);
        var coefficientsArray = computeChebyshevCoefficients(degree, numberOfPoints, baseIntervalZeroPoints, baseFunPoints);

        return createArrayForD3(degree, coefficientsArray);
    };

    /*
     *  graph constructing
     */
    var drawGraph = function () {
        nv.addGraph(function () {
            var chart = nv.models.lineChart()
                    .margin({left: 100})  //Adjust chart margins to give the x-axis some breathing room.
                    .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
                    .transitionDuration(350)  //how fast do you want the lines to transition?
                    .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                    .showYAxis(true)        //Show the y-axis
                    .showXAxis(true)        //Show the x-axis
                ;

            chart.xAxis     //Chart x-axis settings
                .axisLabel('x arguments')
                .tickFormat(d3.format(',r'));

            chart.yAxis     //Chart y-axis settings
                .axisLabel('function value')
                .tickFormat(d3.format('.02f'));

            /* Done setting the chart up? Time to render it!*/
            var myData = generateInputData();   //You need data...

            d3.select('svg')    //Select the <svg> element you want to render the chart in.
                .datum(myData)         //Populate the <svg> element with chart data...
                .call(chart);          //Finally, render the chart!

            //Update the chart when window resizes.
            nv.utils.windowResize(function () {
                chart.update()
            });
            return chart;
        });
    };
    drawGraph();

    function isNumber(o) {
        return !isNaN(o - 0) && o !== null && o !== "" && o !== false;
    }

    $scope.$watch(function () {
        return $scope.input.degree;
    }, function (newVal, oldVal) {
        if (!isNumber(newVal)) {
            $scope.input.degree = oldVal;
        }

        if (newVal == -1) {
            $scope.input.degree = 0;
        }

        if (newVal > 30) {
            $scope.input.degree = 30;
        }
        if ($scope.input.numberOfKnots <= $scope.input.degree) {
            $scope.input.numberOfKnots = $scope.input.degree + 1;
        }
        drawGraph();
    });

    $scope.$watch(function () {
        return $scope.input.numberOfKnots;
    }, function (newVal, oldVal) {
        if (!isNumber(newVal)) {
            $scope.input.numberOfKnots = oldVal;
        }

        if (newVal == -1) {
            $scope.input.degree = 0;
        }

        if ($scope.input.degree <= $scope.input.numberOfKnots) {
            $scope.input.degree = $scope.input.numberOfKnots - 1;
        }
        drawGraph();
    });

    $scope.$watch(function () {
        return $scope.input.baseFunction;
    }, function (newVal, oldVal) {
        drawGraph();
    });

    function generateInputData() {
        var baseFunction = [];

        //Data is represented as an array of {x,y} pairs.
        for (var i = $scope.input.leftInterval; i < $scope.input.rightInterval; i += 0.1) {
            baseFunction.push({x: i, y: $scope.input.baseFunction.impl(i)});
        }
        var arrayD3 = doTheApproximation($scope.input.numberOfKnots, $scope.input.degree);


        //Line chart data should be sent as an array of series objects.
        return [
            {
                values: baseFunction,
                key: 'base function',
                color: '#000000'
            },
            {
                values: arrayD3,
                key: 'approximation',
                color: '#0088CC'
            },
        ];
    }

}]);


