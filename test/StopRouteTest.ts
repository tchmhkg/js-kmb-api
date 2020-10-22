import {params, suite, test} from '@testdeck/mocha';
import Axios from 'axios';
import {assert} from 'chai';
import Sinon, {SinonFakeTimers, SinonStub} from 'sinon';
import Kmb, {StopRoute} from '../src';
import Secret from '../src/Secret';
import {TestCase} from "./TestCase";

@suite
export class StopRouteTest extends TestCase {
    clock : SinonFakeTimers | undefined;

    after() : void {
        this.clock?.restore();
        super.after();
    }

    @params(
        {
            now : '2020-10-18T14:21:57+08:00',
            eta : [
                {
                    w : 'Y',
                    ex : '2020-10-18 14:11:43',
                    eot : 'E',
                    t : '14:10',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 2953
                },
                {
                    w : 'Y',
                    ex : '2020-10-18 14:23:22',
                    eot : 'E',
                    t : '14:22',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                },
                {
                    w : 'Y',
                    ex : '2020-10-18 14:34:13',
                    eot : 'E',
                    t : '14:33 Last Bus',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 7274
                }
            ],
            expected : [
                ['2020-10-18T14:10:00+08:00', 2953, '', true],
                ['2020-10-18T14:22:00+08:00', undefined, '', false],
                ['2020-10-18T14:33:00+08:00', 7274, 'Last Bus', true],
            ]
        }
        , 'simple case'
    )
    @params(
        {
            now : '2020-10-18T23:59:21+08:00',
            eta : [
                {
                    w : 'Y',
                    ex : '2020-10-19 00:00:05',
                    eot : 'E',
                    t : '23:57',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 2953
                },
                {
                    w : 'Y',
                    ex : '2020-10-19 00:00:05',
                    eot : 'E',
                    t : '00:03',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                },
                {
                    w : 'Y',
                    ex : '2020-10-19 00:00:05',
                    eot : 'E',
                    t : '00:10 Last Bus',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 7274
                }
            ],
            expected : [
                ['2020-10-18T23:57:00+08:00', 2953, '', true],
                ['2020-10-19T00:03:00+08:00', undefined, '', false],
                ['2020-10-19T00:10:00+08:00', 7274, 'Last Bus', true],
            ]
        }
        , 'before midnight'
    )
    @params(
        {
            now : '2020-10-19T00:02:13+08:00',
            eta : [
                {
                    w : 'Y',
                    ex : '2020-10-19 00:03:05',
                    eot : 'E',
                    t : '23:57',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 2953
                },
                {
                    w : 'Y',
                    ex : '2020-10-19 00:03:05',
                    eot : 'E',
                    t : '00:03',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                },
                {
                    w : 'Y',
                    ex : '2020-10-19 00:03:05',
                    eot : 'E',
                    t : '00:10 Last Bus',
                    ei : 'Y',
                    bus_service_type : 1,
                    wifi : null,
                    ol : 'N',
                    dis : 7274
                }
            ],
            expected : [
                ['2020-10-18T23:57:00+08:00', 2953, '', true],
                ['2020-10-19T00:03:00+08:00', undefined, '', false],
                ['2020-10-19T00:10:00+08:00', 7274, 'Last Bus', true],
            ]
        }
        , 'after midnight'
    )
    @test
    async getEtasWithGet(
        {now, eta, expected} : {
            now : string,
            eta : {
                w : string,
                ex : string,
                eot : string,
                t : string,
                ei : string,
                bus_service_type : number,
                wifi : null,
                ol : string,
                dis? : number
            },
            expected : [[string, number | undefined, string, boolean]]
        }
    ) : Promise<void> {
        this.clock = Sinon.useFakeTimers(new Date(now));
        Sinon.stub(Secret, 'getSecret')
            .returns(new Secret('A06F1CC2A3A43BD8B7A80846F7D65501AE1503A9&ctr=1043206738', 1043206738));
        const http_stub = Sinon.stub(Axios, 'get').returns(
            Promise.resolve(
                {
                    data : [
                        {
                            routeNo : '960',
                            bound : 2,
                            service_type : 1,
                            seq : 10,
                            responsecode : 0,
                            updated : 1603346890000,
                            generated : 1603346896767,
                            eta
                        }
                    ],
                    status : 200,
                    statusText : 'OK',
                    headers : {},
                    config : {}
                }
            )
        );
        const kmb = new Kmb();
        const stop_route = new kmb.StopRoute(
            new kmb.Stop('WE01-N-1250-0', 'Western Harbour Crossing', 'B', 10)
            , new kmb.Variant(new kmb.Route('960', 2), 1, 'Wan Chai North', 'Tuen Mun (Kin Sang Estate)', '')
            , 10
        );
        const results = await stop_route.getEtas(5, 'GET');
        assert(
            http_stub.calledWith(
                'https://etav3.kmb.hk/?action=geteta'
                , {
                    params : {
                        lang : 'en',
                        route : '960',
                        bound : '2',
                        stop_seq : '10',
                        service_type : '1',
                        vendor_id : Secret.VENDOR_ID,
                        apiKey : 'A06F1CC2A3A43BD8B7A80846F7D65501AE1503A9&ctr=1043206738',
                        ctr : '1043206738',
                    },
                    responseType : 'json'
                }
            )
        );
        assert.deepStrictEqual(
            results
            , expected.map(
                ([date, ...args]) => new kmb.Eta(stop_route, new Date(date), ...args)
            )
        );
    }

    @test
    async getEtasWithFailures() : Promise<void> {
        const {stop_route} = StopRouteTest.setUpFailureCalls();
        const results = await stop_route.getEtas(3, 'GET');
        assert.deepStrictEqual(results, []);
    }

    @test
    async getEtasWithTooManyFailures() : Promise<void> {
        const {http_stub, error, stop_route} = StopRouteTest.setUpFailureCalls();
        await assert.isRejected(stop_route.getEtas(2, 'GET'), error);
        assert.strictEqual(http_stub.callCount, 3);
    }

    private static setUpFailureCalls() : {http_stub : SinonStub, error : Error, stop_route : StopRoute} {
        Sinon.stub(Secret, 'getSecret')
            .returns(new Secret('A06F1CC2A3A43BD8B7A80846F7D65501AE1503A9&ctr=1043206738', 1043206738));
        const http_stub = Sinon.stub(Axios, 'get');
        const error = Object.assign(
            new Error()
            , {
                config : {},
                isAxiosError : true,
                toJSON : () => (
                    {}
                )
            }
        );
        for (let i = 0; i < 3; ++i) {
            http_stub.onCall(i).returns(Promise.reject(error));
        }
        http_stub.returns(
            Promise.resolve(
                {
                    data : [
                        {
                            routeNo : '960',
                            bound : 2,
                            service_type : 1,
                            seq : 10,
                            responsecode : 0,
                            updated : 1603346890000,
                            generated : 1603346896767,
                            eta : []
                        }
                    ],
                    status : 200,
                    statusText : 'OK',
                    headers : {},
                    config : {}
                }
            )
        );
        const kmb = new Kmb();
        const stop_route = new kmb.StopRoute(
            new kmb.Stop('WE01-N-1250-0', 'Western Harbour Crossing', 'B', 10)
            , new kmb.Variant(new kmb.Route('960', 2), 1, 'Wan Chai North', 'Tuen Mun (Kin Sang Estate)', '')
            , 10
        );
        return {http_stub, error, stop_route};
    }
}