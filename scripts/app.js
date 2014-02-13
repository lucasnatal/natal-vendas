var app = angular.module('app', ['ngRoute', 'restangular', 'chieffancypants.loadingBar']);

app
    .config(['$routeProvider', 'RestangularProvider',
        function($routeProvider, RestangularProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl'
            }).
            when('/vendas', {
                templateUrl: 'views/vendas.html',
                controller: 'VendasCtrl'
            }).
            when('/acompanhamento', {
                templateUrl: 'views/acompanhamento.html',
                controller: 'AcompanhamentoCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });

            RestangularProvider.setBaseUrl('https://api.mongolab.com/api/1/databases/natalvendas/collections');
            RestangularProvider.setDefaultRequestParams({
                apiKey: '0vFGORZTolwW2cKZEF2xGgPxCGjnClS2'
            })
            RestangularProvider.setRestangularFields({
                id: '_id.$oid'
            });

            RestangularProvider.setRequestInterceptor(function(elem, operation, what) {

                if (operation === 'put') {
                    elem._id = undefined;
                    return elem;
                }
                return elem;
            })
        }
    ])
    .controller('MainCtrl', ['$scope',
        function($scope) {

        }
    ])
    .controller('VendasCtrl', ['$scope', 'vendaService', 'vendedorService', 'clienteService', 'Restangular', 'natalExceptionsService',
        function($scope, vendaService, vendedorService, clienteService, Restangular, natalExceptionsService) {
            $scope.itens = [];

            function refresh() {
                var delay = 500;
                $scope.clientes = [];
                $scope.vendas = [];
                $scope.vendedores = [];
                setTimeout(function() {
                    $scope.clientes = clienteService.getList();
                    $scope.vendedores = vendedorService.getList();
                    $scope.vendas = vendaService.getList();
                }, delay);
            }

            refresh();
            $scope.venda = vendaService.getDefault($scope.vendas);


            $scope.desabilitarPorStatus = function() {
                return $scope.venda.status == 'Concluida' || $scope.venda.status == 'Cancelada';
            }

            $scope.cancelar = function(venda) {
                try {
                    validar();
                    vendaService.cancelar(venda);
                    refresh();
                } catch (e) {
                    $("#cancelarVenda").popover({
                        title: 'Aviso',
                        content: e.message,
                        html: true
                    });
                }
            }

            $scope.concluir = function(venda) {
                try {
                    validar();
                    // Mais validação...
                    if (venda.itens.length > 0) {
                        vendaService.concluir(venda);
                        refresh();
                    } else {
                        $("#concluirVenda").popover({
                            title: 'Aviso',
                            content: 'Para concluir uma venda, deve-se, ao menos, informar um item!',
                            html: true
                        });
                    }
                } catch (e) {
                    $("#concluirVenda").popover({
                        title: 'Aviso',
                        content: e.message,
                        html: true
                    });
                }
            }

            $scope.excluir = function(venda) {

                vendaService.excluir(venda);
                refresh();
            }

            $scope.novo = function() {
                $scope.venda = vendaService.getDefault($scope.vendas);
            }

            $scope.add = function() {
                $scope.venda.itens.push(vendaService.getDefaultItem($scope.venda));
            }
            $scope.save = function(venda) {
                try {
                    validar();
                    vendaService.save(venda);
                    refresh();
                } catch (e) {
                    $("#gravarVenda").popover({
                        title: 'Aviso',
                        content: e.message,
                        html: true
                    });
                }
            }
            $scope.remove = function(item) {
                var i = $scope.venda.itens.indexOf(item);
                $scope.venda.itens.splice(i, 1);
            }

            $scope.open = function(venda) {
                $scope.venda = venda;
            }

            $scope.total = function(venda) {
                var total = 0;
                for (var i = 0; i < venda.itens.length; i++) {
                    total += venda.itens[i].quantidade * venda.itens[i].preco;
                }
                return total;
            }

            $scope.existVendasWith = function(status) {
                for (var i = $scope.vendas.length - 1; i >= 0; i--) {
                    if ($scope.vendas[i].status == status) {
                        return true;
                    }
                };
                return false;
            }

            function validar() {
                if (!$scope.venda.vendedor) {
                    throw new natalExceptionsService.validationException("Um vendedor deve ser informado!");
                }
                if (!$scope.venda.cliente) {
                    throw new natalExceptionsService.validationException("Um cliente deve ser informado!");
                }
                if ($scope.venda.itens.length > 0) {
                    for (var i = 0; i < $scope.venda.itens.length; i++) {
                        for (prop in $scope.venda.itens[i]) {
                            if (!$scope.venda.itens[i][prop]) {
                                throw new natalExceptionsService.validationException("Todos os campos do item, devem ser preenchidos!");
                            }
                        }
                    }
                }
            }
        }
    ])
    .controller('AcompanhamentoCtrl', ['$scope', '$filter', 'vendaService', 'dateFilter', 'Restangular',
        function($scope, $filter, vendaService, dateFilter, Restangular) {
            function refresh() {
                var delay = 500;
                setTimeout(function() {
                    $scope.vendas = vendaService.getList();
                }, delay);
            }
            refresh();

            $scope.filtros = new Filtros();
            $scope.agruparPor = '';
            $scope.vendasAgrupadas = [];
            $scope.pesquisou = false;

            $scope.total = function(venda) {
                var total = 0;
                for (var i = 0; i < venda.itens.length; i++) {
                    total += venda.itens[i].quantidade * venda.itens[i].preco;
                }
                return total;
            }

            $scope.limpar = function() {
                $scope.pesquisou = false;
                $scope.agruparPor = '';
                $scope.vendas = vendas;
                $scope.filtros = new Filtros();
            }
            $scope.pesquisar = function() {
                $scope.pesquisou = true;
                if (!$scope.agruparPor) {
                    return;
                }
                // Caso seja necessário agrupar...
                $scope.vendasAgrupadas = agruparVendas($scope.agruparPor);

            }

            $scope.totalizar = function(vendas) {
                var total = 0;

                angular.forEach(vendas, function(venda, key) {
                    total += $scope.total(venda);
                });

                return total;
            }

            function agruparVendas(prop) {
                var result = [];
                var objDistinctByProp = [];

                //Crio um 'distinct' do array de vendas.
                angular.forEach($scope.vendas, function(venda, key) {
                    if (objDistinctByProp.indexOf(venda[prop]) == -1) {
                        objDistinctByProp.push(venda[prop]);
                    }
                });

                angular.forEach(objDistinctByProp, function(distinctList, keyI) {
                    result.push(new VendasAgrupadas(distinctList, []));
                    angular.forEach($scope.vendas, function(venda, keyJ) {
                        if (distinctList === venda[prop]) {
                            result[keyI].obj.push(venda);
                        }
                    });

                });
                return result;

                function VendasAgrupadas(grupo, obj) {
                    this.grupo = grupo;
                    this.obj = obj;
                }
            }

            $scope.gerarId = function(value) {

                return 'grupo' + value.replace('/', '').replace('/', '').replace(' ', '');
            }

            function Filtros(dataInicial, dataFinal, cliente, vendedor, status) {
                this.dataInicial = dataInicial;
                this.dataFinal = dataFinal;
                this.cliente = cliente;
                this.vendedor = vendedor;
                this.status = status;
            }

            $scope.$watch('fVendedor', function() {
                if (!$scope.fVendedor) {
                    $scope.filtros.vendedor = undefined;
                }
            });
            $scope.$watch('fCliente', function() {
                if (!$scope.fCliente) {
                    $scope.filtros.cliente = undefined;
                }
            });
            $scope.$watch('fStatus', function() {
                if (!$scope.fStatus) {
                    $scope.filtros.status = undefined;
                }
            });
            $scope.$watch('fData', function() {
                if (!$scope.fData) {
                    $scope.filtros.dataInicial = undefined;
                    $scope.filtros.dataFinal = undefined;
                }
            });
            $scope.$watch('agruparPor', function() {
                //O aviso de nenhuma venda registrada, dispara por causa deste watch.
                $scope.pesquisar();
            });
        }
    ])
    .controller('ClientesCtrl', ['$scope', 'clienteService', 'natalExceptionsService',
        function($scope, clienteService, natalExceptionsService) {
            $scope.cliente = clienteService.getDefault($scope.clientes);

            $scope.saveCli = function() {
                try {
                    validar();
                    return clienteService.saveCli($scope.cliente);
                } catch (e) {
                    $("#gravarCliente").popover({
                        title: 'Aviso',
                        content: e.message,
                        html: true
                    });
                }
            }

            $scope.novoCli = function() {
                $scope.cliente = clienteService.getDefault($scope.clientes);
            }

            function validar() {
                if (!$scope.cliente.nome) {
                    throw new natalExceptionsService.validationException("O nome do cliente deve ser informado!");
                }
            }
        }

    ])
    .controller('VendedoresCtrl', ['$scope', 'vendedorService', 'natalExceptionsService',
        function($scope, vendedorService, natalExceptionsService) {
            $scope.vendedor = vendedorService.getDefault($scope.vendedores);

            $scope.save = function() {
                try {
                    validar();
                    return vendedorService.save($scope.vendedor);
                } catch (e) {
                    $("#gravarVendedor").popover({
                        title: 'Aviso',
                        content: e.message,
                        html: true
                    });
                }
            }

            $scope.novo = function() {
                $scope.vendedor = vendedorService.getDefault($scope.vendedores);
            }

            function validar() {
                if (!$scope.vendedor.nome) {
                    throw new natalExceptionsService.validationException("O nome do vendedor deve ser informado!");
                }
            }
        }
    ])
    .service('natalExceptionsService', [
        function() {
            this.validationException = function(message) {
                this.message = message;
            }

        }
    ])
    .service('clienteService', ['Restangular',
        function(Restangular) {
            var clienteRest = Restangular.all('clientes');

            function getLastCliente(clientes) {
                var id = 0;

                for (var i = 0; i < clientes.length; i++) {
                    if (id < clientes[i].id) {
                        id = clientes[i].id;
                    }
                }

                return id;
            }

            return {
                getDefault: function(clientes) {
                    return {
                        id: getLastCliente(clientes) + 1,
                        nome: null
                    };
                },
                getList: function() {
                    var clientes = [];
                    clienteRest.getList().then(function(data) {
                        for (var i = 0; i < data.length; i++) {
                            clientes.push(data[i]);
                        };
                    });

                    return clientes;
                },
                save: function(cliente) {
                    if (!cliente._id) {
                        clienteRest.post(cliente);
                    } else {
                        cliente.put();
                    }
                }
            };
        }

    ])
    .service('vendedorService', ['Restangular',
        function(Restangular) {
            var vendedorRest = Restangular.all('vendedores');

            function getLastVendedor(vendedores) {
                var id = 0;

                for (var i = 0; i < vendedores.length; i++) {
                    if (id < vendedores[i].id) {
                        id = vendedores[i].id;
                    }
                }

                return id;
            }
            return {
                getDefault: function(vendedores) {
                    return {
                        id: getLastVendedor(vendedores) + 1,
                        nome: null
                    }
                },
                getList: function() {
                    var vendedores = [];
                    vendedorRest.getList().then(function(data) {
                        for (var i = 0; i < data.length; i++) {
                            vendedores.push(data[i]);
                        };
                    });
                    return vendedores;
                },
                save: function(vendedor) {
                    if (!vendedor._id) {
                        vendedorRest.post(vendedor);
                    } else {
                        vendedor.put();
                    }
                }
            };

        }

    ])
    .service('vendaService', ['Restangular',
        function(Restangular) {
            var vendaRest = Restangular.all('vendas');

            function getLastVenda(vendas) {
                var id = 0;

                for (var i = 0; i < vendas.length; i++) {
                    if (id < vendas[i].id) {
                        id = vendas[i].id;
                    }
                }

                return id;
            }

            function getLastVendaItem(venda) {
                var id = 0;
                if (venda && venda.itens.length > 0 && venda.itens[venda.itens.length - 1].i_item) {
                    id = venda.itens[venda.itens.length - 1].i_item;
                }
                return id;
            }

            return {
                getDefault: function(vendas) {
                    return {
                        id: getLastVenda(vendas) + 1,
                        cliente: {
                            id: null,
                            nome: null
                        },
                        vendedor: {
                            id: null,
                            nome: null
                        },
                        itens: [],
                        data: moment().format('DD/MM/YYYY'),
                        status: 'Aberta'
                    }

                },
                getDefaultItem: function(venda) {
                    return {
                        i_item: getLastVendaItem(venda) + 1,
                        produto: null,
                        quantidade: null,
                        preco: null
                    }
                },
                getList: function(venda) {
                    var vendas = [];
                    vendaRest.getList().then(function(data) {
                        for (var i = 0; i < data.length; i++) {
                            vendas.push(data[i]);
                        };
                    });
                    return vendas;
                },
                cancelar: function(venda) {
                    venda.status = 'Cancelada';
                    venda.put();
                },
                concluir: function(venda) {
                    venda.status = 'Concluida';
                    venda.put();
                },
                excluir: function(venda) {
                    venda.remove();
                },
                save: function(venda) {
                    if (!venda._id) {
                        vendaRest.post(venda);
                    } else { //gravar
                        venda.put();
                    }
                }
            };

        }
    ])
    .filter('dateFilter', function() {
        return function(objects, prop, dInicial, dFinal) {
            var filtered_list = [];
            var data;

            if (!dInicial || !dFinal) {
                return objects;
            }
            for (var i = 0; i < objects.length; i++) {
                data = objects[i][prop];
                if (moment(dInicial).format('DD/MM/YYYY') <= data && moment(dFinal).format('DD/MM/YYYY') >= data) {
                    filtered_list.push(objects[i]);
                }
            }
            return filtered_list;
        }

    });
