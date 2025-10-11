import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Zap, Trash2, BarChart3, Shield } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const DummyDataTestPanel = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  
  // 관리자 권한 체크
  const isAdmin = user?.role === 'ADMIN';
  const [testConfig, setTestConfig] = useState({
    count: 10000,
    propertyCount: 5,
    dataType: 'realistic',
    testType: 'scroll',
    testSize: 1000
  });

  // 데이터 상태 확인
  useEffect(() => {
    checkDataStatus();
  }, []);

  const checkDataStatus = async () => {
    try {
      const response = await api.get('/api/dummy/status');
      setDataStatus(response.data);
    } catch (error) {
      console.error('데이터 상태 확인 실패:', error);
    }
  };

  // 대량 더미 데이터 생성
  const generateBulkData = async () => {
    setIsLoading(true);
    setProgress(0);
    
    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post('/api/dummy/generate-bulk', null, {
        params: {
          count: testConfig.count,
          propertyCount: testConfig.propertyCount,
          dataType: testConfig.dataType
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      setTestResults(response.data);
      await checkDataStatus();
      
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error('더미 데이터 생성 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 성능 테스트 실행
  const runPerformanceTest = async () => {
    setIsLoading(true);
    setProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      const response = await api.post('/api/dummy/performance-test', null, {
        params: {
          testSize: testConfig.testSize,
          testType: testConfig.testType
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      setTestResults(response.data);
      
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error('성능 테스트 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 더미 데이터 삭제
  const clearDummyData = async () => {
    if (!confirm('모든 더미 데이터를 삭제하시겠습니까?')) return;
    
    setIsLoading(true);
    try {
      const response = await api.delete('/api/dummy/clear');
      setTestResults(response.data);
      await checkDataStatus();
    } catch (error) {
      console.error('더미 데이터 삭제 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터베이스 최적화
  const optimizeDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/dummy/optimize');
      setTestResults(response.data);
    } catch (error) {
      console.error('데이터베이스 최적화 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 관리자 권한이 없으면 접근 제한 메시지 표시
  if (!isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <div className="text-center">
              <Shield className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-600">관리자 권한이 필요합니다</h3>
              <p className="text-sm text-gray-500">
                더미 데이터 생성 및 성능 테스트는 관리자만 사용할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">더미 데이터 테스트 패널</h2>
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span className="text-sm text-gray-600">
            문서: {dataStatus?.documentCount || 0}개
          </span>
          <span className="text-sm text-gray-600">
            속성: {dataStatus?.propertyCount || 0}개
          </span>
        </div>
      </div>

      {/* 데이터 생성 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>대량 데이터 생성</span>
          </CardTitle>
          <CardDescription>
            1만 개 이상의 더미 데이터를 빠르게 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="count">데이터 개수</Label>
              <Input
                id="count"
                type="number"
                value={testConfig.count}
                onChange={(e) => setTestConfig(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="propertyCount">속성 개수</Label>
              <Input
                id="propertyCount"
                type="number"
                value={testConfig.propertyCount}
                onChange={(e) => setTestConfig(prev => ({ ...prev, propertyCount: parseInt(e.target.value) }))}
                placeholder="5"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="dataType">데이터 타입</Label>
            <Select value={testConfig.dataType} onValueChange={(value) => setTestConfig(prev => ({ ...prev, dataType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">실제 데이터 시뮬레이션</SelectItem>
                <SelectItem value="stress">스트레스 테스트용</SelectItem>
                <SelectItem value="random">랜덤 데이터</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={generateBulkData} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                데이터 생성 중...
              </>
            ) : (
              <>
                <Database className="mr-2 w-4 h-4" />
                대량 데이터 생성
              </>
            )}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>진행률</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 성능 테스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>성능 테스트</span>
          </CardTitle>
          <CardDescription>
            가상화 성능을 테스트합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testSize">테스트 크기</Label>
              <Input
                id="testSize"
                type="number"
                value={testConfig.testSize}
                onChange={(e) => setTestConfig(prev => ({ ...prev, testSize: parseInt(e.target.value) }))}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="testType">테스트 타입</Label>
              <Select value={testConfig.testType} onValueChange={(value) => setTestConfig(prev => ({ ...prev, testType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scroll">스크롤 성능</SelectItem>
                  <SelectItem value="search">검색 성능</SelectItem>
                  <SelectItem value="sort">정렬 성능</SelectItem>
                  <SelectItem value="general">일반 성능</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={runPerformanceTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                테스트 실행 중...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 w-4 h-4" />
                성능 테스트 실행
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 관리 도구 */}
      <Card>
        <CardHeader>
          <CardTitle>관리 도구</CardTitle>
          <CardDescription>
            데이터베이스 관리 및 최적화
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={optimizeDatabase} 
              disabled={isLoading}
              variant="outline"
            >
              <Database className="mr-2 w-4 h-4" />
              DB 최적화
            </Button>
            <Button 
              onClick={clearDummyData} 
              disabled={isLoading}
              variant="destructive"
            >
              <Trash2 className="mr-2 w-4 h-4" />
              더미 데이터 삭제
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 테스트 결과 */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.success ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-500">
                    성공
                  </Badge>
                  {testResults.executionTime && (
                    <p className="text-sm">실행 시간: {testResults.executionTime}ms</p>
                  )}
                  {testResults.documentCount && (
                    <p className="text-sm">생성된 문서: {testResults.documentCount}개</p>
                  )}
                  {testResults.propertyCount && (
                    <p className="text-sm">생성된 속성: {testResults.propertyCount}개</p>
                  )}
                  {testResults.insertTime && (
                    <p className="text-sm">삽입 시간: {testResults.insertTime}ms</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">실패</Badge>
                  <p className="text-sm text-red-600">{testResults.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DummyDataTestPanel;
