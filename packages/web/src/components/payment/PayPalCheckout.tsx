import { logger } from '@/utils/logger';
import { useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
}

interface PayPalCheckoutProps {
  plan: Plan;
  onSuccess: (planId: string, paymentId: string) => void;
  onCancel: () => void;
}

export function PayPalCheckout({ plan, onSuccess, onCancel }: PayPalCheckoutProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const createOrder = async () => {
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id, amount: plan.price }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.orderId;
    } catch (err) {
      toast.error('创建订单失败', { description: '请稍后重试' });
      throw err;
    }
  };

  const onApprove = async (data: any) => {
    setStatus('processing');
    try {
      const res = await fetch('/api/payment/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: data.orderID, planId: plan.id }),
      });
      const result = await res.json();
      if (result.success) {
        setStatus('success');
        toast.success('支付成功', { description: `已升级到${plan.name}` });
        onSuccess(plan.id, result.paymentId);
      } else {
        setStatus('error');
        toast.error('支付失败', { description: result.error });
      }
    } catch (err) {
      setStatus('error');
      toast.error('支付处理失败', { description: '请稍后重试' });
    }
  };

  const onError = (err: any) => {
    setStatus('error');
    logger.error('PayPal error:', err);
    toast.error('支付错误', { description: '请稍后重试' });
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">加载支付组件...</span>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900">支付成功！</h3>
        <p className="text-sm text-gray-500 mt-1">您已升级到 {plan.name}</p>
        <Button className="mt-4" onClick={() => onSuccess(plan.id, '')}>
          继续使用
        </Button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900">支付失败</h3>
        <p className="text-sm text-gray-500 mt-1">请稍后重试或联系客服</p>
        <div className="flex gap-3 justify-center mt-4">
          <Button variant="secondary" onClick={onCancel}>取消</Button>
          <Button onClick={() => setStatus('idle')}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="font-medium text-gray-900">{plan.name}</h3>
        <p className="text-2xl font-bold text-primary-600 mt-1">
          ¥{plan.price}<span className="text-sm font-normal text-gray-500">/{plan.period}</span>
        </p>
        <ul className="mt-3 space-y-1">
          {plan.features.map((f, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {status === 'processing' ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-gray-600">处理中...</span>
        </div>
      ) : (
        <PayPalButtons
          style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onCancel={() => {
            toast.info('支付已取消');
            onCancel();
          }}
        />
      )}
    </div>
  );
}
