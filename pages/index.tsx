import type { NextPage } from 'next';
import { FC, useCallback, useEffect, useState } from 'react';
import { SiweMessage } from 'siwe';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsName,
  useNetwork,
  useSignMessage,
} from 'wagmi';

const Home: NextPage = () => {
  const { data: account } = useAccount();
  const { data: ensName } = useEnsName({ address: account?.address });
  const { connect, connectors, error, isConnecting, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { activeChain } = useNetwork();

  const [state, setState] = useState<{
    address?: string;
    error?: Error;
    loading?: boolean;
  }>({});

  useEffect(() => {
    console.log({ account, activeChain });
  }, [account, activeChain]);

  const signIn = useCallback(async () => {
    try {
      const address = account?.address;
      const chainId = activeChain?.id;
      if (!address || !chainId) return alert('No account or chain');

      // set loading to true
      setState((x) => ({ ...x, error: undefined, loading: true }));

      // Fetch random nonce, create SIWE message, and sign with wallet
      const nonceRes = await fetch('/api/nonce');
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: await nonceRes.text(),
      });
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });
      if (!signature) throw Error('Signature is empty');

      // Verify signature
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) throw new Error('Error verifying message');

      // update the state with the address and set loading to false
      setState((x) => ({ ...x, address, loading: false }));

      // @ts-expect-error we are assigning a type to error
    } catch (error: Error) {
      setState((x) => ({ ...x, error, loading: false }));
    }
  }, [account, activeChain]);

  // Fetch user when:
  useEffect(() => {
    const handler = async () => {
      try {
        const res = await fetch('/api/me');
        const json = await res.json();
        setState((x) => ({ ...x, address: json.address }));
      } catch (_error) {}
    };
    // 1. page loads
    handler();

    // 2. window is focused (in case user logs out of another window)
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  // if there is an active wallet connection
  if (account) {
    return (
      <div className='py-24 text-center flex flex-col'>
        <div>
          {ensName ? `${ensName} (${account.address})` : account.address}
        </div>
        <div>Connected to {account?.connector?.name}</div>

        {state.address ? (
          // shown when the user is signed in
          <div>
            <div>Signed in as {state.address}</div>
            <button
              className='rounded bg-slate-200 p-2 w-fit mx-auto mt-2'
              onClick={async () => {
                await fetch('/api/logout');
                setState({});
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          // shown when the user is not signed in
          <button
            className='rounded bg-slate-200 p-2 w-fit mx-auto mt-2'
            disabled={state.loading}
            onClick={signIn}
          >
            Sign-In with Ethereum
          </button>
        )}
        <button
          className='rounded bg-slate-200 p-2 w-fit mx-auto mt-2'
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
        <InfoSection />
      </div>
    );
  }

  // if there is NO active wallet connection
  return (
    <div className='py-24 text-center'>
      <h1 className='text-2xl font-bold'>Welcome to create-web3-frontend</h1>
      <p className='mt-10'>Connect your wallet:</p>
      <div className='mt-5 flex justify-center gap-6'>
        {connectors.map((connector) => {
          return (
            <button
              className='rounded bg-slate-200 p-2'
              key={connector.id}
              onClick={() => connect(connector)}
            >
              {connector.name}
              {!connector.ready && ' (unsupported)'}
              {isConnecting &&
                connector.id === pendingConnector?.id &&
                ' (connecting)'}
            </button>
          );
        })}
      </div>

      {error && <div>{error.message}</div>}

      <InfoSection />
    </div>
  );
};

const InfoSection: FC = () => {
  return (
    <div className='mt-10'>
      <hr className='my-4' />
      <h2 className='text-xl font-bold'>If you need help</h2>
      <div className='flex flex-col gap-2 mt-2'>
        <a
          href='https://wagmi.sh'
          target='_blank'
          className='underline text-gray-600'
        >
          Link to wagmi docs
        </a>
        <a
          href='https://github.com/dhaiwat10/create-web3-frontend'
          target='_blank'
          className='underline text-gray-600'
        >
          Open an issue on Github
        </a>
        <a
          href='https://twitter.com/dhaiwat10'
          target='_blank'
          className='underline text-gray-600'
        >
          DM me on Twitter
        </a>
      </div>
    </div>
  );
};

export default Home;
